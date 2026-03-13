<?php

declare(strict_types=1);

namespace OCA\Excalidraw\Controller;

use OCA\Excalidraw\AppInfo\Application;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\PublicShareController;
use OCP\IRequest;
use OCP\ISession;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\Share\IManager as IShareManager;
use OCP\Share\IShare;
use OCP\Util;

class PublicViewController extends PublicShareController {
	private ?IShare $share = null;

	public function __construct(
		IRequest $request,
		ISession $session,
		private IShareManager $shareManager,
	) {
		parent::__construct(Application::APPNAME, $request, $session);
	}

	protected function getPasswordHash(): string {
		return $this->share?->getPassword() ?? '';
	}

	public function isValidToken(): bool {
		try {
			$this->share = $this->shareManager->getShareByToken($this->getToken());
			return true;
		} catch (ShareNotFound) {
			return false;
		}
	}

	protected function isPasswordProtected(): bool {
		return $this->share !== null && $this->share->getPassword() !== null;
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function show(string $token): TemplateResponse {
		Util::addScript(Application::APPNAME, 'public');

		return new TemplateResponse(Application::APPNAME, 'public', [
			'token'    => $token,
			'fileName' => $this->share?->getNode()?->getName() ?? 'Excalidraw',
		], 'public');
	}
}
