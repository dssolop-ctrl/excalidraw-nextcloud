<template>
	<div :class="['file-card', { 'file-card--list': listView }]" @click="$emit('open', file)">
		<div v-if="!listView" class="file-card__preview">
			<svg class="file-card__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
				<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
			</svg>
		</div>

		<div v-if="listView" class="file-card__list-icon">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
			</svg>
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
			</NcActions>
		</div>
	</div>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'
import { generateUrl } from '@nextcloud/router'

const RU = {
	'Edit': 'Редактировать',
	'Show in Files': 'Показать в Файлах',
	'Share': 'Поделиться',
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

	emits: ['open'],

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

		openSharing() {
			// Open native NC sharing panel in the Files app
			const dir = this.file.path.substring(0, this.file.path.lastIndexOf('/'))
			window.location.href = generateUrl('/apps/files/?dir={dir}&fileid={fileid}&opendetails=true&details=sharing', {
				dir,
				fileid: this.file.id,
			})
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
