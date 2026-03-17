<template>
	<div :class="['file-card', { 'file-card--list': listView }]" @click="$emit('open', file)">
		<div v-if="!listView" class="file-card__preview">
			<img class="file-card__icon" :src="appIconUrl" alt="">
		</div>

		<div v-if="listView" class="file-card__list-icon">
			<img width="20" height="20" :src="appIconUrl" alt="">
		</div>

		<div class="file-card__info">
			<span class="file-card__name" :title="file.name">{{ displayName }}</span>
			<span v-if="!listView" class="file-card__meta">{{ formattedSize }} · {{ formattedDate }}</span>
		</div>

		<span v-if="listView" class="file-card__size">{{ formattedSize }}</span>
		<span v-if="listView" class="file-card__date">{{ formattedDate }}</span>

		<div class="file-card__actions" @click.stop>
			<NcActions>
				<NcActionButton @click="$emit('open', file)">
					<template #icon>
						<span class="icon-edit" />
					</template>
					{{ tr('Edit') }}
				</NcActionButton>
				<NcActionButton @click="openInFiles">
					<template #icon>
						<span class="icon-folder" />
					</template>
					{{ tr('Show in Files') }}
				</NcActionButton>
				<NcActionButton @click="openSharing">
					<template #icon>
						<span class="icon-share" />
					</template>
					{{ tr('Share') }}
				</NcActionButton>
				<NcActionButton @click="deleteFile">
					<template #icon>
						<span class="icon-delete" />
					</template>
					{{ tr('Delete') }}
				</NcActionButton>
			</NcActions>
		</div>
	</div>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'
import { generateUrl, generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'

const RU = {
	'Edit': 'Редактировать',
	'Show in Files': 'Показать в Файлах',
	'Share': 'Поделиться',
	'Link copied': 'Ссылка скопирована',
	'Share link created and copied to clipboard': 'Публичная ссылка создана и скопирована в буфер обмена',
	'Copied to clipboard': 'Скопировано в буфер обмена',
	'Creating share link…': 'Создание ссылки…',
	'Failed to create share link': 'Не удалось создать ссылку',
	'Delete': 'Удалить',
	'Delete failed': 'Не удалось удалить',
}

function formatBytes(bytes) {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default {
	name: 'FileCard',

	components: { NcActions, NcActionButton },

	props: {
		file: { type: Object, required: true },
		listView: { type: Boolean, default: false },
		lang: { type: String, default: 'ru' },
	},

	emits: ['open', 'notify', 'deleted'],

	computed: {
		displayName() {
			return this.file.name.replace(/\.excalidraw$/i, '')
		},
		formattedSize() {
			return formatBytes(this.file.size || 0)
		},
		formattedDate() {
			if (!this.file.modified) return ''
			const locale = this.lang === 'ru' ? 'ru-RU' : undefined
			return new Date(this.file.modified * 1000).toLocaleDateString(locale, {
				day: 'numeric', month: 'short', year: 'numeric',
			})
		},
		appIconUrl() {
			return generateUrl('/apps/excalidraw/img/app.svg')
		},
	},

	methods: {
		tr(key) {
			if (this.lang === 'en') return key
			return RU[key] || key
		},
		openInFiles() {
			const dir = this.file.path.substring(0, this.file.path.lastIndexOf('/'))
			window.location.href = generateUrl('/apps/files/?dir={dir}&scrollto={name}', {
				dir,
				name: this.file.name,
			})
		},

		async deleteFile() {
			if (!confirm(this.tr('Delete') + ' "' + this.displayName + '"?')) return
			try {
				await axios.post(generateUrl('/apps/excalidraw/api/v1/delete'), {
					path: this.file.path,
				})
				this.$emit('deleted', this.file)
			} catch (err) {
				console.error('[excalidraw] Delete failed:', err)
				this.$emit('notify', this.tr('Delete failed'))
			}
		},

		async openSharing() {
			const filePath = this.file.path
			const ocsUrl = generateOcsUrl('apps/files_sharing/api/v1/shares')

			try {
				// Check for existing public link shares
				const { data: listData } = await axios.get(ocsUrl, {
					params: { path: filePath, format: 'json' },
				})
				const existing = (listData.ocs?.data || []).find(s => s.share_type === 3)

				let shareUrl
				if (existing) {
					shareUrl = existing.url
				} else {
					// Create new public link share (read-only)
					const { data: createData } = await axios.post(ocsUrl, {
						path: filePath,
						shareType: 3,
						permissions: 1,
					})
					shareUrl = createData.ocs?.data?.url
				}

				if (shareUrl) {
					await navigator.clipboard.writeText(shareUrl)
					this.$emit('notify', this.tr('Link copied'))
				}
			} catch (err) {
				console.error('[excalidraw] Share failed:', err)
				this.$emit('notify', this.tr('Failed to create share link'))
			}
		},
	},
}
</script>

<style scoped>
/* ── Grid view (default card) ── */
.file-card {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--color-border);
	border-radius: 12px;
	overflow: hidden;
	cursor: pointer;
	transition: box-shadow 0.15s ease, border-color 0.15s ease;
	background: var(--color-main-background);
}
.file-card:hover {
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.file-card__preview {
	height: 140px;
	background: var(--color-background-dark);
	display: flex;
	align-items: center;
	justify-content: center;
}
.file-card__icon {
	width: 48px;
	height: 48px;
	color: var(--color-text-maxcontrast);
	opacity: 0.4;
}
.file-card__info {
	padding: 10px 12px 6px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}
.file-card__name {
	font-weight: 600;
	font-size: 14px;
	color: var(--color-main-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.file-card__meta {
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}
.file-card__actions {
	display: flex;
	justify-content: flex-end;
	padding: 0 4px 4px;
}

/* ── List view ── */
.file-card--list {
	flex-direction: row;
	align-items: center;
	border-radius: 8px;
	padding: 0 8px;
	gap: 12px;
	height: 44px;
}
.file-card--list .file-card__info {
	flex: 1;
	padding: 0;
	flex-direction: row;
	align-items: center;
	gap: 8px;
}
.file-card--list .file-card__name {
	flex: 1;
	min-width: 0;
}
.file-card__list-icon {
	color: var(--color-text-maxcontrast);
	opacity: 0.5;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}
.file-card__size,
.file-card__date {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	flex-shrink: 0;
	width: 80px;
	text-align: right;
}
.file-card__date {
	width: 110px;
}
.file-card--list .file-card__actions {
	padding: 0;
	flex-shrink: 0;
}
</style>
