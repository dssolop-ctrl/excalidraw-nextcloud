<?php

declare(strict_types=1);

namespace OCA\Excalidraw\Controller;

use OCA\Excalidraw\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;
use OCP\Util;

class PageController extends Controller {
	public function __construct(IRequest $request) {
		parent::__construct(Application::APPNAME, $request);
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function index(): TemplateResponse {
		Util::addScript(Application::APPNAME, 'navigator');
		Util::addStyle(Application::APPNAME, 'navigator');
		return new TemplateResponse(Application::APPNAME, 'navigator');
	}
}
