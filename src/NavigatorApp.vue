<template>
	<NcContent app-name="excalidraw">
		<NcAppNavigation>
			<template #list>
				<NcAppNavigationCaption :name="t('excalidraw', 'Watched folders')" />

				<TreeNode
					v-for="folder in tree"
					:key="folder.path"
					:node="folder"
					:selected-path="selectedFolderPath"
					@select="onFolderSelect"
				/>

				<NcAppNavigationItem
					:name="t('excalidraw', 'Add folder…')"
					@click="showAddFolder = true">
					<template #icon>
						<span class="icon-add" />
					</template>
				</NcAppNavigationItem>
			</template>

			<template #footer>
				<div class="nav-footer">
					<NcButton type="tertiary" @click="refreshTree">
						<template #icon>
							<span class="icon-history" />
						</template>
						{{ t('excalidraw', 'Refresh') }}
					</NcButton>
				</div>
			</template>
		</NcAppNavigation>

		<NcAppContent>
			<div class="excalidraw-content">
				<div class="content-header">
					<h2 v-if="selectedFolder">{{ selectedFolder.name }}</h2>
					<h2 v-else>{{ t('excalidraw', 'Select a folder') }}</h2>
					<span v-if="currentFiles.length" class="file-count">
						{{ currentFiles.length }} {{ currentFiles.length === 1 ? 'drawing' : 'drawings' }}
					</span>
				</div>

				<div v-if="currentFiles.length" class="file-grid">
					<FileCard
						v-for="file in currentFiles"
						:key="file.id"
						:file="file"
						@open="openFile"
					/>
				</div>

				<NcEmptyContent
					v-else-if="selectedFolder && !loading"
					:name="t('excalidraw', 'No drawings here')"
					:description="t('excalidraw', 'Create .excalidraw files in this folder to see them here')">
					<template #icon>
						<span class="icon-file" />
					</template>
				</NcEmptyContent>

				<NcLoadingIcon v-if="loading" :size="44" class="loading-spinner" />
			</div>
		</NcAppContent>

		<!-- Add folder dialog -->
		<NcDialog
			v-if="showAddFolder"
			:name="t('excalidraw', 'Add watched folder')"
			@close="showAddFolder = false">
			<div class="add-folder-dialog">
				<NcTextField
					v-model="newFolderPath"
					:label="t('excalidraw', 'Folder path (e.g. /Excalidraw)')"
					:placeholder="'/Excalidraw'"
				/>
				<div class="add-folder-actions">
					<NcButton type="secondary" @click="showAddFolder = false">
						{{ t('excalidraw', 'Cancel') }}
					</NcButton>
					<NcButton type="primary" :disabled="!newFolderPath.trim()" @click="addFolder">
						{{ t('excalidraw', 'Add') }}
					</NcButton>
				</div>
			</div>
		</NcDialog>
	</NcContent>
</template>

<script>
import {
	NcContent,
	NcAppNavigation,
	NcAppNavigationCaption,
	NcAppNavigationItem,
	NcAppContent,
	NcButton,
	NcDialog,
	NcEmptyContent,
	NcLoadingIcon,
	NcTextField,
} from '@nextcloud/vue'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'

import TreeNode from './components/TreeNode.vue'
import FileCard from './components/FileCard.vue'

export default {
	name: 'NavigatorApp',

	components: {
		NcContent,
		NcAppNavigation,
		NcAppNavigationCaption,
		NcAppNavigationItem,
		NcAppContent,
		NcButton,
		NcDialog,
		NcEmptyContent,
		NcLoadingIcon,
		NcTextField,
		TreeNode,
		FileCard,
	},

	data() {
		return {
			tree: [],
			selectedFolderPath: '',
			loading: false,
			showAddFolder: false,
			newFolderPath: '',
			watchedFolders: [],
		}
	},

	computed: {
		selectedFolder() {
			if (!this.selectedFolderPath) return null
			return this.findFolder(this.tree, this.selectedFolderPath)
		},
		currentFiles() {
			if (!this.selectedFolder?.children) return []
			return this.selectedFolder.children.filter(c => c.type === 'file')
		},
	},

	async mounted() {
		await this.loadSettings()
		await this.refreshTree()
	},

	methods: {
		t,

		async loadSettings() {
			try {
				const { data } = await axios.get(generateUrl('/apps/excalidraw/api/v1/settings'))
				this.watchedFolders = data.watchedFolders || ['/Excalidraw']
			} catch {
				this.watchedFolders = ['/Excalidraw']
			}
		},

		async refreshTree() {
			this.loading = true
			try {
				const { data } = await axios.get(generateUrl('/apps/excalidraw/api/v1/tree'))
				this.tree = data
				if (!this.selectedFolderPath && this.tree.length > 0) {
					this.selectedFolderPath = this.tree[0].path
				}
			} catch {
				this.tree = []
			} finally {
				this.loading = false
			}
		},

		onFolderSelect(path) {
			this.selectedFolderPath = path
		},

		openFile(file) {
			const dir = file.path.substring(0, file.path.lastIndexOf('/'))
			window.location.href = generateUrl('/apps/files/?dir={dir}&openfile={id}', {
				dir,
				id: file.id,
			})
		},

		async addFolder() {
			const path = '/' + this.newFolderPath.trim().replace(/^\/+/, '')
			if (this.watchedFolders.includes(path)) {
				this.showAddFolder = false
				return
			}
			this.watchedFolders.push(path)
			this.showAddFolder = false
			this.newFolderPath = ''
			try {
				await axios.put(generateUrl('/apps/excalidraw/api/v1/settings'), {
					watchedFolders: this.watchedFolders,
				})
				await this.refreshTree()
			} catch (e) {
				console.error('[excalidraw] Failed to save settings:', e)
			}
		},

		findFolder(nodes, path) {
			for (const node of nodes) {
				if (node.path === path && node.type === 'folder') return node
				if (node.children) {
					const found = this.findFolder(node.children, path)
					if (found) return found
				}
			}
			return null
		},
	},
}
</script>

<style scoped>
.excalidraw-content {
	padding: 20px 24px;
	height: 100%;
	overflow-y: auto;
}
.content-header {
	display: flex;
	align-items: baseline;
	gap: 12px;
	margin-bottom: 20px;
}
.content-header h2 {
	font-size: 22px;
	font-weight: 600;
	margin: 0;
}
.file-count {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
}
.file-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 16px;
}
.loading-spinner {
	display: flex;
	justify-content: center;
	margin-top: 40px;
}
.nav-footer {
	padding: 8px;
}
.add-folder-dialog {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 12px;
}
.add-folder-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
</style>
