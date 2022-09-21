"ui-thread";

const { createWindow } = require('floating_window');
const { accessibility } = require('accessibility');
const { requestListeningNotifications } = require('notification');
const { delay } = require('lang');

require('rhino').install();
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

        island.setState("medium");
        island.setMessage(n.tickerText ?? n.getTitle(), n.appIcon);
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
    const pm = $autojs.androidContext.getPackageManager();
    return pm.getApplicationInfo(packageName, 0).loadIcon(pm);
}

class DynamicIsland {
    static styles = {
        "small": {
            w: 100, h: 30, radius: 15,
        },
        "medium": {
            w: 215, h: 30, radius: 15, messageContainer: true,
        },
        "large": {
            w: 400, h: 80, radius: 40, expandedMessage: true,
        },
    };

    constructor() {
        this.window = createWindow({ context: accessibility.service });
        this.window.setPosition(0, -100);
    }

    async show() {
        await this.window.setViewFromXmlFile('./island.xml');

        this.card = this.window.view.findView('card');
        this.messageContainer = this.window.view.findView("message");
        this.messageText = this.window.view.findView("messageText");
        this.messageIcon = this.window.view.findView("messageIcon");
        this.expandedMessage = this.window.view.findView("expandedMessage");
        this.expandedMessageIcon = this.window.view.findView("expandedMessageIcon");
        this.expandedMessageTitle = this.window.view.findView("expandedMessageTitle");
        this.expandedMessageContent = this.window.view.findView("expandedMessageContent");

        const transition = this.card.getParent().getLayoutTransition();
        transition.enableTransitionType(LayoutTransition.CHANGING);
        transition.setInterpolator(LayoutTransition.CHANGING, new OvershootInterpolator());

        this.setState('small');
        this.window.show();
    }

    onMessageClick(callback) {
        this.messageContainer.on("click", callback);
    }

    onExpandedMessageClick(callback) {
        this.expandedMessage.on("click", callback);
    }

    setMessage(messageText, icon) {
        this.messageText.attr('text', messageText);
        this.messageIcon.setImageDrawable(icon);
    }

    setExpandedMessage(title, content, icon) {
        this.expandedMessageTitle.attr('text', title);
        this.expandedMessageContent.attr('text', content);
        this.expandedMessageIcon.setImageDrawable(icon);
    }

    setState(state) {
        const style = DynamicIsland.styles[state];
        this.card.attr("w", style.w.toString())
        this.card.attr("h", style.h.toString());
        this.card.attr("cardCornerRadius", style.radius.toString());
        this.messageContainer.attr("visibility", style.messageContainer ? 'visible' : 'gone');
        this.expandedMessage.attr("visibility", style.expandedMessage ? 'visible' : 'gone');
    }
}
main();