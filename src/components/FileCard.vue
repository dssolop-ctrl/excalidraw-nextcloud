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
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
						</svg>
					</template>
					{{ tr('Edit') }}
				</NcActionButton>
				<NcActionButton @click="openInFiles">
					<template #icon>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z" />
						</svg>
					</template>
					{{ tr('Show in Files') }}
				</NcActionButton>
				<NcActionButton @click="openSharing">
					<template #icon>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z" />
						</svg>
					</template>
					{{ tr('Share') }}
				</NcActionButton>
				<NcActionButton @click="deleteFile">
					<template #icon>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
						</svg>
					</template>
					{{ tr('Delete') }}
				</NcActionButton>
			</NcActions>
		</div>
	</div>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'
import { generateUrl, generateOcsUrl, imagePath } from '@nextcloud/router'
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
			return imagePath('excalidraw', 'app.svg')
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
