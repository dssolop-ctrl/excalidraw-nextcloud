<template>
	<NcAppNavigationItem
		:name="node.name"
		:active="isSelected"
		:allow-collapse="hasSubfolders"
		:open="isOpen"
		@click="$emit('select', node.path)"
		@update:open="isOpen = $event">
		<template #icon>
			<span class="icon-folder" />
		</template>

		<template v-if="fileCount > 0" #counter>
			<NcCounterBubble>{{ fileCount }}</NcCounterBubble>
		</template>

		<template v-if="hasSubfolders" #default>
			<TreeNode
				v-for="child in subfolders"
				:key="child.path"
				:node="child"
				:selected-path="selectedPath"
				@select="$emit('select', $event)"
			/>
		</template>
	</NcAppNavigationItem>
</template>

<script>
import { NcAppNavigationItem, NcCounterBubble } from '@nextcloud/vue'

export default {
	name: 'TreeNode',

	components: {
		NcAppNavigationItem,
		NcCounterBubble,
	},

	props: {
		node: { type: Object, required: true },
		selectedPath: { type: String, default: '' },
	},

	emits: ['select'],

	data() {
		return { isOpen: false }
	},

	computed: {
		isSelected() {
			return this.selectedPath === this.node.path
		},
		subfolders() {
			return (this.node.children || []).filter(c => c.type === 'folder')
		},
		hasSubfolders() {
			return this.subfolders.length > 0
		},
		fileCount() {
			return this.countFiles(this.node)
		},
	},

	methods: {
		countFiles(node) {
			if (!node.children) return 0
			let n = 0
			for (const c of node.children) {
				if (c.type === 'file') n++
				else if (c.type === 'folder') n += this.countFiles(c)
			}
			return n
		},
	},
}
</script>
