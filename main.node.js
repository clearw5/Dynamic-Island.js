"ui-thread";
const { createWindow } = require("floating_window");
const { accessibility } = require("accessibility");
const { requestListeningNotifications } = require("notification");
const { delay } = require("lang");
const { device } = require("device");
const context = $autojs.androidContext;
const scale = context.getResources().getDisplayMetrics().density;
require("rhino").install();
const LayoutTransition = android.animation.LayoutTransition;
const OvershootInterpolator = android.view.animation.OvershootInterpolator;

async function main() {
	await accessibility.enableService({ toast: "请授予本应用无障碍权限" });
	const notificationListenerService = await requestListeningNotifications({ toast: "请授予本应用通知使用权" });

	await delay(500);
	const island = new DynamicIsland();
	await island.show();

	let timeout;
	let lastNotification;
	notificationListenerService.on("notification", n => {
		n.appIcon = loadIcon(n.getPackageName());
		lastNotification = n;
		//修改顺序,以增加宽度自适应功能
		island.setMessage(n.tickerText ?? n.getTitle(), n.appIcon);
		island.setState("medium");
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			island.setState("small");
		}, 2500);
	});
	island.onMessageClick(() => {
		island.setExpandedMessage(lastNotification.getTitle(), lastNotification.getText(), lastNotification.appIcon);
		island.setState("large");
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			island.setState("small");
		}, 2500);
	});
	island.onExpandedMessageClick(() => {
		lastNotification?.click();
		lastNotification = undefined;
		island.setState("small");
		clearTimeout(timeout);
	});
	$autojs.keepRunning();
}

function loadIcon(packageName) {
	const pm = context.getPackageManager();
	return pm.getApplicationInfo(packageName, 0).loadIcon(pm);
}
function getStatusBarHeight() {
	let resources = context.getResources();
	let resourceId = resources.getIdentifier("status_bar_height", "dimen", "android");
	return resources.getDimensionPixelSize(resourceId);
}
function px2dp(px) {
	return Math.floor(px / scale + 0.5);
}
class DynamicIsland {
	static styles = {
		small: {
			w: 100,
			h: 30,
			radius: 15,
		},
		medium: {
			w: -2,
			h: 30,
			radius: 15,
			messageContainer: true,
		},
		large: {
			w: 400,
			h: 80,
			radius: 40,
			expandedMessage: true,
		},
	};

	constructor() {
		//fix:宽度,高度不适应不同设备
		this.window = createWindow({
			context: accessibility.service,
			initialSize: {
				width: -1,
				height: -2,
			},
		});
		this.window.setPosition(0, 15 - getStatusBarHeight());
	}
	get view() {
		return new Proxy(this, {
			get: (target, key) => {
				return this.window.view.findView(key);
			},
		});
	}
	async show() {
		await this.window.setViewFromXmlFile("./island.xml");
		this.card = this.view.card;
		this.messageContainer = this.view.message;
		this.messageText = this.view.messageText;
		this.messageIcon = this.view.messageIcon;
		this.expandedMessage = this.view.expandedMessage;
		this.expandedMessageIcon = this.view.expandedMessageIcon;
		this.expandedMessageTitle = this.view.expandedMessageTitle;
		this.expandedMessageContent = this.view.expandedMessageContent;

		const transition = this.card.getParent().getLayoutTransition();
		transition.enableTransitionType(LayoutTransition.CHANGING);
		transition.setInterpolator(LayoutTransition.CHANGING, new OvershootInterpolator());

		this.setState("small");
		this.window.show();
	}

	onMessageClick(callback) {
		this.messageContainer.on("click", callback);
	}

	onExpandedMessageClick(callback) {
		this.expandedMessage.on("click", callback);
	}

	setMessage(messageText, icon) {
		this.messageText.attr("text", messageText);
		this.messageIcon.setImageDrawable(icon);
	}

	setExpandedMessage(title, content, icon) {
		this.expandedMessageTitle.attr("text", title);
		this.expandedMessageContent.attr("text", content);
		this.expandedMessageIcon.setImageDrawable(icon);
	}

	setState(state) {
		const style = DynamicIsland.styles[state];
		//增加自动宽度
		this.card.attr("w", style.w.toString());
		this.card.attr("h", style.h.toString());
		this.card.attr("cardCornerRadius", style.radius.toString());
		this.messageContainer.attr("visibility", style.messageContainer ? "visible" : "gone");
		this.expandedMessage.attr("visibility", style.expandedMessage ? "visible" : "gone");
	}
}
main();
