<?php

declare(strict_types=1);

namespace OCA\Excalidraw\Provider;

use OCA\Excalidraw\AppInfo\Application;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\Template\PublicTemplateResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Defaults;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\Share\IShare;
use OCP\Share\IPublicShareTemplateProvider;
use OCP\Util;

class ExcalidrawPublicShareProvider implements IPublicShareTemplateProvider {
	public function __construct(
		private IURLGenerator $urlGenerator,
		private IL10N $l10n,
		private Defaults $defaults,
	) {}

	public function shouldRespond(IShare $share): bool {
		try {
			return str_ends_with(strtolower($share->getNode()->getName()), '.excalidraw');
		} catch (\Exception) {
			return false;
		}
	}

	public function renderPage(IShare $share, string $token, string $path): TemplateResponse {
		$fileName = $share->getNode()->getName();

		Util::addHeader('meta', [
			'property' => 'og:title',
			'content'  => $fileName,
		]);
		Util::addHeader('meta', [
			'property' => 'og:description',
			'content'  => $this->l10n->t('Excalidraw drawing shared from %s', [$this->defaults->getName()]),
		]);
		Util::addHeader('meta', [
			'property' => 'og:type',
			'content'  => 'object',
		]);
		Util::addHeader('meta', [
			'property' => 'og:url',
			'content'  => $this->urlGenerator->linkToRouteAbsolute(
				'files_sharing.sharecontroller.showShare',
				['token' => $token]
			),
		]);

		Util::addScript(Application::APPNAME, 'public');

		$response = new PublicTemplateResponse(Application::APPNAME, 'public', [
			'token'    => $token,
			'fileName' => $fileName,
		]);

		$response->setHeaderTitle($fileName);
		$response->setHeaderDetails($this->l10n->t('Excalidraw drawing'));

		$csp = new ContentSecurityPolicy();
		$csp->addAllowedScriptDomain("'self'");
		$csp->addAllowedFrameDomain("'self'");
		$csp->addAllowedImageDomain('blob:');
		$csp->addAllowedImageDomain('data:');
		$csp->addAllowedFontDomain("'self'");
		$response->setContentSecurityPolicy($csp);

		return $response;
	}
}
