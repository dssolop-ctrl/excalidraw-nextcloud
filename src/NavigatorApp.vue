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
					<div class="content-header__left">
						<h2 v-if="selectedFolder">{{ selectedFolder.name }}</h2>
						<h2 v-else>{{ t('excalidraw', 'Select a folder') }}</h2>
						<span v-if="currentFiles.length" class="file-count">
							{{ currentFiles.length }} {{ currentFiles.length === 1 ? 'drawing' : 'drawings' }}
						</span>
					</div>

					<div class="content-header__right">
						<NcButton
							v-if="selectedFolder"
							type="primary"
							@click="showNewFile = true">
							<template #icon>
								<span class="icon-add" />
							</template>
							{{ t('excalidraw', 'New drawing') }}
						</NcButton>

						<div class="view-toggle">
							<NcButton
								:type="viewMode === 'grid' ? 'secondary' : 'tertiary'"
								:aria-label="t('excalidraw', 'Grid view')"
								@click="viewMode = 'grid'">
								<template #icon>
									<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
										<rect x="1" y="1" width="7" height="7" rx="1.5" />
										<rect x="12" y="1" width="7" height="7" rx="1.5" />
										<rect x="1" y="12" width="7" height="7" rx="1.5" />
										<rect x="12" y="12" width="7" height="7" rx="1.5" />
									</svg>
								</template>
							</NcButton>
							<NcButton
								:type="viewMode === 'list' ? 'secondary' : 'tertiary'"
								:aria-label="t('excalidraw', 'List view')"
								@click="viewMode = 'list'">
								<template #icon>
									<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
										<rect x="1" y="2" width="18" height="3" rx="1" />
										<rect x="1" y="8.5" width="18" height="3" rx="1" />
										<rect x="1" y="15" width="18" height="3" rx="1" />
									</svg>
								</template>
							</NcButton>
						</div>
					</div>
				</div>

				<div v-if="currentFiles.length" :class="viewMode === 'grid' ? 'file-grid' : 'file-list'">
					<FileCard
						v-for="file in currentFiles"
						:key="file.id"
						:file="file"
						:list-view="viewMode === 'list'"
						@open="openFile"
					/>
				</div>

				<NcEmptyContent
					v-else-if="selectedFolder && !loading"
					:name="t('excalidraw', 'No drawings here')"
					:description="t('excalidraw', 'Click «New drawing» to create one')">
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
			<div class="dialog-body">
				<NcTextField
					v-model="newFolderPath"
					:label="t('excalidraw', 'Folder path (e.g. /Excalidraw)')"
					:placeholder="'/Excalidraw'"
				/>
				<div class="dialog-actions">
					<NcButton type="secondary" @click="showAddFolder = false">
						{{ t('excalidraw', 'Cancel') }}
					</NcButton>
					<NcButton type="primary" :disabled="!newFolderPath.trim()" @click="addFolder">
						{{ t('excalidraw', 'Add') }}
					</NcButton>
				</div>
			</div>
		</NcDialog>

		<!-- New drawing dialog -->
		<NcDialog
			v-if="showNewFile"
			:name="t('excalidraw', 'New drawing')"
			@close="showNewFile = false">
			<div class="dialog-body">
				<NcTextField
					ref="newFileInput"
					v-model="newFileName"
					:label="t('excalidraw', 'Drawing name')"
					:placeholder="t('excalidraw', 'My drawing')"
					@keydown.enter="createFile"
				/>
				<div class="dialog-actions">
					<NcButton type="secondary" @click="showNewFile = false">
						{{ t('excalidraw', 'Cancel') }}
					</NcButton>
					<NcButton type="primary" :disabled="!newFileName.trim() || creating" @click="createFile">
						{{ creating ? t('excalidraw', 'Creating…') : t('excalidraw', 'Create') }}
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
			viewMode: 'grid',
			showNewFile: false,
			newFileName: '',
			creating: false,
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
			if (window.__excalidrawOpenEditor) {
				window.__excalidrawOpenEditor(file.path, {
					onClose: () => this.refreshTree(),
				})
			}
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

		async createFile() {
			const name = this.newFileName.trim()
			if (!name || this.creating) return

			this.creating = true
			try {
				const { data } = await axios.post(generateUrl('/apps/excalidraw/api/v1/create'), {
					dir: this.selectedFolderPath,
					name,
				})
				this.showNewFile = false
				this.newFileName = ''
				await this.refreshTree()
				// Open the newly created file in the editor
				if (data.path) {
					this.openFile(data)
				}
			} catch (e) {
				console.error('[excalidraw] Failed to create file:', e)
			} finally {
				this.creating = false
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
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 20px;
	flex-wrap: wrap;
}
.content-header__left {
	display: flex;
	align-items: baseline;
	gap: 12px;
	min-width: 0;
}
.content-header__right {
	display: flex;
	align-items: center;
	gap: 8px;
}
.content-header h2 {
	font-size: 22px;
	font-weight: 600;
	margin: 0;
}
.file-count {
	color: var(--color-text-maxcontrast);
	font-size: 14px;
	white-space: nowrap;
}
.view-toggle {
	display: flex;
	gap: 2px;
}
.file-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 16px;
}
.file-list {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.loading-spinner {
	display: flex;
	justify-content: center;
	margin-top: 40px;
}
.nav-footer {
	padding: 8px;
}
.dialog-body {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 12px;
}
.dialog-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
</style>
