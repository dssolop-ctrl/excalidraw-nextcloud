<?php

declare(strict_types=1);

namespace OCA\Excalidraw\Controller;

use OCA\Excalidraw\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\JSONResponse;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUserSession;

class ApiController extends Controller {
	private const DEFAULT_WATCHED = '/Excalidraw';
	private const SETTINGS_KEY   = 'watched_folders';
	private const EXT            = '.excalidraw';

	public function __construct(
		IRequest $request,
		private IRootFolder $rootFolder,
		private IUserSession $userSession,
		private IConfig $config,
	) {
		parent::__construct(Application::APPNAME, $request);
	}

	/**
	 * GET /api/v1/tree — nested JSON tree of .excalidraw files
	 * in the user's watched folders.
	 */
	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function tree(): JSONResponse {
		$uid = $this->getUserId();
		if ($uid === null) {
			return new JSONResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
		}

		$userFolder = $this->rootFolder->getUserFolder($uid);
		$watched = $this->getWatched($uid);
		$tree = [];

		foreach ($watched as $folderPath) {
			$folderPath = trim($folderPath, '/');
			if ($folderPath === '') {
				continue;
			}
			try {
				$folder = $userFolder->get($folderPath);
				if ($folder instanceof Folder) {
					$node = $this->scanFolder($folder, '/' . $folderPath);
					if ($node !== null) {
						$tree[] = $node;
					}
				}
			} catch (NotFoundException) {
				continue;
			}
		}

		return new JSONResponse($tree);
	}

	/**
	 * GET /api/v1/file?path=/Excalidraw/diagram.excalidraw
	 * Returns raw JSON content of a single .excalidraw file.
	 */
	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function fileContent(): JSONResponse {
		$uid = $this->getUserId();
		if ($uid === null) {
			return new JSONResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
		}

		$path = $this->request->getParam('path', '');
		if ($path === '' || !str_ends_with(strtolower($path), self::EXT)) {
			return new JSONResponse(['error' => 'Invalid path or type'], Http::STATUS_BAD_REQUEST);
		}

		try {
			$file = $this->rootFolder->getUserFolder($uid)->get(ltrim($path, '/'));
			if (!$file instanceof File) {
				return new JSONResponse(['error' => 'Not a file'], Http::STATUS_BAD_REQUEST);
			}
			$data = json_decode($file->getContent(), true);
			if ($data === null) {
				return new JSONResponse(['error' => 'Invalid JSON'], Http::STATUS_INTERNAL_SERVER_ERROR);
			}
			return new JSONResponse($data);
		} catch (NotFoundException) {
			return new JSONResponse(['error' => 'File not found'], Http::STATUS_NOT_FOUND);
		}
	}

	/**
	 * GET /api/v1/settings — user's watched folders list.
	 */
	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function getSettings(): JSONResponse {
		$uid = $this->getUserId();
		if ($uid === null) {
			return new JSONResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
		}
		return new JSONResponse(['watchedFolders' => $this->getWatched($uid)]);
	}

	/**
	 * PUT /api/v1/settings — save watched folders.
	 * Body: { "watchedFolders": ["/Excalidraw", "/Projects/Diagrams"] }
	 */
	#[NoAdminRequired]
	public function setSettings(): JSONResponse {
		$uid = $this->getUserId();
		if ($uid === null) {
			return new JSONResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
		}

		$folders = $this->request->getParam('watchedFolders', []);
		if (!is_array($folders)) {
			return new JSONResponse(['error' => 'Invalid format'], Http::STATUS_BAD_REQUEST);
		}

		$folders = array_values(array_unique(array_filter(
			array_map(fn(string $f) => '/' . trim($f, '/'), $folders),
			fn(string $f) => $f !== '/'
		)));

		$this->config->setUserValue(
			$uid, Application::APPNAME, self::SETTINGS_KEY, json_encode($folders)
		);

		return new JSONResponse(['watchedFolders' => $folders]);
	}

	/**
	 * POST /api/v1/file — create a new empty .excalidraw file.
	 * Body: { "dir": "/Excalidraw", "name": "My diagram" }
	 */
	#[NoAdminRequired]
	public function createFile(): JSONResponse {
		$uid = $this->getUserId();
		if ($uid === null) {
			return new JSONResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
		}

		$dir = $this->request->getParam('dir', '');
		$name = trim($this->request->getParam('name', ''));

		if ($dir === '' || $name === '') {
			return new JSONResponse(['error' => 'Missing dir or name'], Http::STATUS_BAD_REQUEST);
		}

		if (!str_ends_with(strtolower($name), self::EXT)) {
			$name .= self::EXT;
		}

		try {
			$userFolder = $this->rootFolder->getUserFolder($uid);
			$folder = $userFolder->get(ltrim($dir, '/'));
			if (!$folder instanceof Folder) {
				return new JSONResponse(['error' => 'Not a folder'], Http::STATUS_BAD_REQUEST);
			}

			$emptyScene = json_encode([
				'type' => 'excalidraw',
				'version' => 2,
				'source' => 'excalidraw-nextcloud',
				'elements' => [],
				'appState' => ['gridSize' => null],
				'files' => new \stdClass(),
			]);

			$file = $folder->newFile($name, $emptyScene);

			return new JSONResponse([
				'id'       => $file->getId(),
				'name'     => $file->getName(),
				'path'     => $dir . '/' . $file->getName(),
				'type'     => 'file',
				'size'     => $file->getSize(),
				'modified' => $file->getMTime(),
			]);
		} catch (\OCP\Files\NotPermittedException $e) {
			return new JSONResponse(['error' => 'Permission denied'], Http::STATUS_FORBIDDEN);
		} catch (NotFoundException) {
			return new JSONResponse(['error' => 'Folder not found'], Http::STATUS_NOT_FOUND);
		}
	}

	// ─── Helpers ───────────────────────────────────────────────

	private function scanFolder(Folder $folder, string $relPath): ?array {
		$children = [];

		foreach ($folder->getDirectoryListing() as $node) {
			if ($node instanceof Folder) {
				$child = $this->scanFolder($node, $relPath . '/' . $node->getName());
				if ($child !== null) {
					$children[] = $child;
				}
			} elseif ($node instanceof File && str_ends_with(strtolower($node->getName()), self::EXT)) {
				$children[] = [
					'id'       => $node->getId(),
					'name'     => $node->getName(),
					'path'     => $relPath . '/' . $node->getName(),
					'type'     => 'file',
					'size'     => $node->getSize(),
					'modified' => $node->getMTime(),
					'etag'     => $node->getEtag(),
				];
			}
		}

		if (empty($children)) {
			return null;
		}

		usort($children, function (array $a, array $b) {
			if ($a['type'] !== $b['type']) {
				return $a['type'] === 'folder' ? -1 : 1;
			}
			return strnatcasecmp($a['name'], $b['name']);
		});

		return [
			'id'       => $folder->getId(),
			'name'     => $folder->getName(),
			'path'     => $relPath,
			'type'     => 'folder',
			'children' => $children,
		];
	}

	private function getWatched(string $uid): array {
		$raw = $this->config->getUserValue($uid, Application::APPNAME, self::SETTINGS_KEY, '');
		if ($raw === '') {
			return [self::DEFAULT_WATCHED];
		}
		$arr = json_decode($raw, true);
		return is_array($arr) ? $arr : [self::DEFAULT_WATCHED];
	}

	private function getUserId(): ?string {
		return $this->userSession->getUser()?->getUID();
	}
}
