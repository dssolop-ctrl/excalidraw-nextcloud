<?php

return [
	'routes' => [
		// Navigator page (main app page with sidebar + file list)
		[
			'name' => 'page#index',
			'url'  => '/',
			'verb' => 'GET',
		],

		// API: get file tree for configured folders
		[
			'name' => 'api#tree',
			'url'  => '/api/v1/tree',
			'verb' => 'GET',
		],

		// API: get file content (for preview thumbnails)
		[
			'name' => 'api#fileContent',
			'url'  => '/api/v1/file',
			'verb' => 'GET',
		],

		// API: get/set user settings (watched folders)
		[
			'name' => 'api#getSettings',
			'url'  => '/api/v1/settings',
			'verb' => 'GET',
		],
		[
			'name' => 'api#setSettings',
			'url'  => '/api/v1/settings',
			'verb' => 'PUT',
		],

		// Public share viewer
		[
			'name' => 'public_view#show',
			'url'  => '/s/{token}',
			'verb' => 'GET',
		],
	],
];
