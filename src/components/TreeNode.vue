<template>
	<NcAppNavigationItem
		:name="node.name"
		:active="isSelected"
		:allow-collapse="hasSubfolders"
		:open="isOpen"
		@click="$emit('select', node.path)"
		@update:open="isOpen = $event">
		<template #icon>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M20,18H4V8H20M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z" />
			</svg>
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
