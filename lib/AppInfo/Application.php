<?php

declare(strict_types=1);

namespace OCA\Excalidraw\AppInfo;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Excalidraw\Listeners\FilesLoadAdditionalScriptsListener;
use OCA\Excalidraw\Provider\ExcalidrawPublicShareProvider;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application extends App implements IBootstrap {
	public const APPNAME = 'excalidraw';

	public function __construct() {
		parent::__construct(self::APPNAME);
	}

	public function register(IRegistrationContext $context): void {
		// Original: file action script loader for the Files app
		$context->registerEventListener(
			LoadAdditionalScriptsEvent::class,
			FilesLoadAdditionalScriptsListener::class
		);

		// New: public share template provider for .excalidraw files
		$context->registerPublicShareTemplateProvider(
			ExcalidrawPublicShareProvider::class
		);
	}

	public function boot(IBootContext $context): void {
	}
}
