<template>
	<div class="file-card" @click="$emit('open', file)">
		<div class="file-card__preview">
			<svg class="file-card__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
				<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
			</svg>
		</div>

		<div class="file-card__info">
			<span class="file-card__name" :title="file.name">{{ displayName }}</span>
			<span class="file-card__meta">{{ formattedSize }} · {{ formattedDate }}</span>
		</div>

		<div class="file-card__actions" @click.stop>
			<NcActions>
				<NcActionButton @click="$emit('open', file)">
					<template #icon>
						<span class="icon-edit" />
					</template>
					{{ t('excalidraw', 'Edit') }}
				</NcActionButton>
				<NcActionButton @click="openInFiles">
					<template #icon>
						<span class="icon-folder" />
					</template>
					{{ t('excalidraw', 'Show in Files') }}
				</NcActionButton>
				<NcActionLink :href="shareLink" target="_blank">
					<template #icon>
						<span class="icon-public" />
					</template>
					{{ t('excalidraw', 'Share link') }}
				</NcActionLink>
			</NcActions>
		</div>
	</div>
</template>

<script>
import { NcActions, NcActionButton, NcActionLink } from '@nextcloud/vue'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'

function formatBytes(bytes) {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default {
	name: 'FileCard',

	components: { NcActions, NcActionButton, NcActionLink },

	props: {
		file: { type: Object, required: true },
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
			return new Date(this.file.modified * 1000).toLocaleDateString(undefined, {
				day: 'numeric', month: 'short', year: 'numeric',
			})
		},
		shareLink() {
			const dir = this.file.path.substring(0, this.file.path.lastIndexOf('/'))
			return generateUrl('/apps/files/?dir={dir}&openfile={id}', {
				dir,
				id: this.file.id,
			})
		},
	},

	methods: {
		t,
		openInFiles() {
			const dir = this.file.path.substring(0, this.file.path.lastIndexOf('/'))
			window.location.href = generateUrl('/apps/files/?dir={dir}&scrollto={name}', {
				dir,
				name: encodeURIComponent(this.file.name),
			})
		},
	},
}
</script>

<style scoped>
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
</style>
