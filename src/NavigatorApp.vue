<template>
	<NcContent app-name="excalidraw">
		<NcAppNavigation>
			<template #list>
				<NcAppNavigationCaption :name="tr('Folders')" />

				<TreeNode
					v-for="folder in tree"
					:key="folder.path"
					:node="folder"
					:selected-path="selectedFolderPath"
					@select="onFolderSelect"
				/>
			</template>

			<template #footer>
				<div class="nav-footer">
					<NcAppNavigationItem
						:name="tr('Refresh')"
						@click="refreshTree">
						<template #icon>
							<span class="icon-history" />
						</template>
					</NcAppNavigationItem>
					<NcAppNavigationItem
						:name="tr('Settings')"
						@click="showSettings = true">
						<template #icon>
							<span class="icon-settings" />
						</template>
					</NcAppNavigationItem>
				</div>
			</template>
		</NcAppNavigation>

		<NcAppContent>
			<div class="excalidraw-content">
				<div class="content-header">
					<div class="content-header__left">
						<h2 v-if="selectedFolder">{{ selectedFolder.name }}</h2>
						<h2 v-else>{{ tr('Select a folder') }}</h2>
						<span v-if="currentFiles.length" class="file-count">
							{{ fileCountLabel }}
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
							{{ tr('New drawing') }}
						</NcButton>

						<div class="view-toggle">
							<NcButton
								:type="viewMode === 'grid' ? 'secondary' : 'tertiary'"
								:aria-label="tr('Grid view')"
								@click="setViewMode('grid')">
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
								:aria-label="tr('List view')"
								@click="setViewMode('list')">
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
						:lang="lang"
						@open="openFile"
					/>
				</div>

				<NcEmptyContent
					v-else-if="selectedFolder && !loading"
					:name="tr('No drawings here')"
					:description="tr('Click «New drawing» to create one')">
					<template #icon>
						<span class="icon-file" />
					</template>
				</NcEmptyContent>

				<NcLoadingIcon v-if="loading" :size="44" class="loading-spinner" />
			</div>
		</NcAppContent>

		<!-- Settings dialog -->
		<NcDialog
			v-if="showSettings"
			:name="tr('Settings')"
			size="normal"
			@close="showSettings = false">
			<div class="settings-body">
				<!-- Folders section -->
				<div class="settings-section">
					<h3>{{ tr('Folders') }}</h3>
					<p class="settings-hint">{{ tr('Add parent folders — subfolders are scanned automatically') }}</p>
					<ul class="folder-list">
						<li v-for="folder in watchedFolders" :key="folder" class="folder-list__item">
							<span class="icon-folder folder-list__icon" />
							<span class="folder-list__path">{{ folder }}</span>
							<NcButton
								type="tertiary"
								:aria-label="tr('Remove')"
								@click="removeFolder(folder)">
								<template #icon>
									<span class="icon-close" />
								</template>
							</NcButton>
						</li>
					</ul>
					<div class="folder-add">
						<NcTextField
							v-model="newFolderPath"
							:label="tr('Folder path')"
							:placeholder="'/Excalidraw'"
							@keydown.enter="addFolder"
						/>
						<NcButton
							type="secondary"
							:disabled="!newFolderPath.trim()"
							@click="addFolder">
							{{ tr('Add') }}
						</NcButton>
					</div>
				</div>

				<!-- Language section -->
				<div class="settings-section">
					<h3>{{ tr('Language') }}</h3>
					<div class="lang-options">
						<label class="lang-option">
							<input
								type="radio"
								value="ru"
								:checked="lang === 'ru'"
								@change="setLang('ru')">
							Русский
						</label>
						<label class="lang-option">
							<input
								type="radio"
								value="en"
								:checked="lang === 'en'"
								@change="setLang('en')">
							English
						</label>
					</div>
				</div>
			</div>
		</NcDialog>

		<!-- New drawing dialog -->
		<NcDialog
			v-if="showNewFile"
			:name="tr('New drawing')"
			@close="showNewFile = false">
			<div class="dialog-body">
				<NcTextField
					ref="newFileInput"
					v-model="newFileName"
					:label="tr('Drawing name')"
					:placeholder="tr('My drawing')"
					@keydown.enter="createFile"
				/>
				<div class="dialog-actions">
					<NcButton type="secondary" @click="showNewFile = false">
						{{ tr('Cancel') }}
					</NcButton>
					<NcButton type="primary" :disabled="!newFileName.trim() || creating" @click="createFile">
						{{ creating ? tr('Creating…') : tr('Create') }}
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
import axios from '@nextcloud/axios'

import TreeNode from './components/TreeNode.vue'
import FileCard from './components/FileCard.vue'

const RU = {
	'Folders': 'Папки',
	'Settings': 'Настройки',
	'Refresh': 'Обновить',
	'Select a folder': 'Выберите папку',
	'New drawing': 'Новый рисунок',
	'Grid view': 'Плитки',
	'List view': 'Список',
	'No drawings here': 'Нет рисунков',
	'Click «New drawing» to create one': 'Нажмите «Новый рисунок» чтобы создать',
	'Drawing name': 'Название рисунка',
	'My drawing': 'Мой рисунок',
	'Cancel': 'Отмена',
	'Create': 'Создать',
	'Creating…': 'Создание…',
	'Language': 'Язык',
	'Remove': 'Удалить',
	'Add': 'Добавить',
	'Folder path': 'Путь к папке',
	'Add parent folders — subfolders are scanned automatically': 'Добавьте родительские папки — вложенные сканируются автоматически',
}

function ruPlural(n) {
	const mod10 = n % 10
	const mod100 = n % 100
	if (mod10 === 1 && mod100 !== 11) return `${n} рисунок`
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} рисунка`
	return `${n} рисунков`
}

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
			watchedFolders: [],
			viewMode: localStorage.getItem('excalidraw-viewMode') || 'grid',
			lang: localStorage.getItem('excalidraw-lang') || 'ru',
			showSettings: false,
			showNewFile: false,
			newFolderPath: '',
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
		fileCountLabel() {
			const n = this.currentFiles.length
			if (this.lang === 'ru') return ruPlural(n)
			return `${n} ${n === 1 ? 'drawing' : 'drawings'}`
		},
	},

	async mounted() {
		await this.loadSettings()
		await this.refreshTree()
	},

	methods: {
		tr(key) {
			if (this.lang === 'en') return key
			return RU[key] || key
		},

		setViewMode(mode) {
			this.viewMode = mode
			localStorage.setItem('excalidraw-viewMode', mode)
		},

		setLang(lang) {
			this.lang = lang
			localStorage.setItem('excalidraw-lang', lang)
		},

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
			if (!path || path === '/' || this.watchedFolders.includes(path)) {
				return
			}
			this.watchedFolders.push(path)
			this.newFolderPath = ''
			await this.saveWatchedFolders()
		},

		async removeFolder(path) {
			this.watchedFolders = this.watchedFolders.filter(f => f !== path)
			if (this.selectedFolderPath.startsWith(path)) {
				this.selectedFolderPath = ''
			}
			await this.saveWatchedFolders()
		},

		async saveWatchedFolders() {
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
	padding: 20px 24px 20px 52px;
	height: 100%;
	min-height: 0;
	overflow-y: auto;
	box-sizing: border-box;
	background: var(--color-main-background);
	border-left: 1px solid var(--color-border);
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

/* Sidebar footer */
.nav-footer {
	padding: 0;
	border-top: 1px solid var(--color-border);
}

/* Settings dialog */
.settings-body {
	padding: 4px 16px 16px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}
.settings-section h3 {
	font-size: 16px;
	font-weight: 600;
	margin: 0 0 4px;
}
.settings-hint {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	margin: 0 0 10px;
}
.folder-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-bottom: 8px;
}
.folder-list__item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 4px 4px 8px;
	border-radius: 6px;
	background: var(--color-background-dark);
}
.folder-list__icon {
	flex-shrink: 0;
	opacity: 0.5;
}
.folder-list__path {
	flex: 1;
	font-size: 14px;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.folder-add {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}
.folder-add > :first-child {
	flex: 1;
}

/* Language options */
.lang-options {
	display: flex;
	gap: 20px;
	margin-top: 4px;
}
.lang-option {
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	font-size: 14px;
}
.lang-option input[type="radio"] {
	margin: 0;
}

/* New drawing dialog */
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
