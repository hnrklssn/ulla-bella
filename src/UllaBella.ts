import {
    Discord,
    On,
    Client,
    Command,
    CommandMessage,
    CommandNotFound,
    Guard,
    MetadataStorage,
} from "@typeit/discord";
import { ClientUser, Message } from "discord.js";

function NotBot(message: Message, client: Client) {
    return client?.user?.id !== message.author.id;
}

function isAuthorized(message: Message) {
    return message.member.roles.cache.some(role => role.name === 'labbledare');
}

function Authorize(message: Message, client: Client) {
    if(!isAuthorized(message)) {
        message.reply("you don't have permission to do that");
        return false;
    }
    return true;
}

@Discord({ prefix: "!", commandCaseSensitive: true })
abstract class AppDiscord {
    private helpQ = [];
    private presentQ = [];

    @Command("hello")
    @Guard(NotBot)
    private hello(
        message: CommandMessage,
        client: Client
    ) {
        console.log("command received");
        console.log("msg: ", message);
        message.reply("Hello!");
    }

    @Command("askForHelp")
    @Guard(NotBot)
    private addHelp(
        message: CommandMessage,
        client: Client
    ) {
        if(this.helpQ.includes(message.author)) {
            message.reply(["you are already in line for help.", "You can remove yourself from the queue with !removeHelp, or view the queue with !showHelp"]);
            return;
        }
        console.log("mentions: ", message.mentions);
        const len = this.helpQ.push(message.author);
        message.reply(["you are now in line for help.", this.queuePositionText(len-1)]);
    }

    @Command("nextHelp")
    @Guard(NotBot, Authorize)
    private popHelp(
        message: CommandMessage,
        client: Client
    ) {
        console.log("!nextHelp received");
        if(this.helpQ.length === 0) {
            message.reply("the help queue is empty.");
            return;
        }
        const student = this.helpQ.shift();
        message.reply(`the next person in line is ${student}.`);
        this.popImpl(student, message);
        return;
    }

    @Command("showHelp")
    @Guard(NotBot)
    private showHelp(
        message: CommandMessage,
        client: Client
    ) {
        const displayedQ = this.showQueueImpl(this.helpQ);
        message.reply(["this is the current help queue:", ...displayedQ]);
    }

    @Command("removeHelp")
    @Guard(NotBot)
    private removeHelp(
        message: CommandMessage,
        client: Client
    ) {
        if(!this.helpQ.includes(message.author)) {
            message.reply("you are not currently in line for help.");
            return;
        }
        this.helpQ = this.helpQ.filter((e) => e != message.author);
        message.reply("you have been removed from the help queue.");
    }

    // TODO: disable queueing for both at the same time
    // TODO: add presentation in pairs
    @Command("askToPresent")
    @Guard(NotBot)
    private addPresenter(
        message: CommandMessage,
        client: Client
    ) {
        if(this.presentQ.includes(message.author)) {
            message.reply(["you are already in line to present.", "You can remove yourself from the queue with !removePresent, or view the queue with !showPresent"]);
            return;
        }
        const len = this.presentQ.push(message.author);
        message.reply(["you are now in line to present.", this.queuePositionText(len-1)]);
    }

    @Command("nextPresent")
    @Guard(NotBot, Authorize)
    private popPresenter(
        message: CommandMessage,
        client: Client
    ) {
        if(this.presentQ.length === 0) {
            message.reply("the presentation queue is empty.");
            return;
        }
        const student = this.presentQ.shift();
        message.reply(`the next person in line is ${student}.`);
        this.popImpl(student, message);
        return;
    }

    @Command("showPresent")
    @Guard(NotBot)
    private showPresenters(
        message: CommandMessage,
        client: Client
    ) {
        const displayedQ = this.showQueueImpl(this.presentQ);
        message.reply(["this is the current presentation queue:", ...displayedQ]);
    }

    @Command("removePresent")
    @Guard(NotBot)
    private removePresent(
        message: CommandMessage,
        client: Client
    ) {
        if(!this.presentQ.includes(message.author)) {
            message.reply("you are not currently in line to present.");
            return;
        }
        this.helpQ = this.presentQ.filter((e) => e != message.author);
        message.reply("you have been removed from the presentation queue.");
    }

    @Command("next")
    @Guard(NotBot, Authorize)
    private popAny(
        message: CommandMessage,
        client: Client
    ) {
        if(this.presentQ.length === 0 && this.helpQ.length === 0) {
            message.reply("both queues are empty.");
            return;
        }
        let student;
        if(this.presentQ.length > this.helpQ.length * 3) {
            student = this.presentQ.shift();
            message.reply(`the next person in line is ${student}. They want to present.`);
        } else {
            student = this.helpQ.shift();
            message.reply(`the next person in line is ${student}. They want help.`);
        }
        this.popImpl(student, message);
    }

    // TODO: add descriptions
    @Command("commands")
    @Command("help")
    @Guard(NotBot)
    private commands(
        message: CommandMessage,
        client: Client
    ) {
        const cmds = this.getCommands();
        const unrestricted = cmds.filter(cmd => !this.isRestrictedCommand(cmd));
        message.reply(["these are the available commands:", ...unrestricted.map(cmd => cmd.commandName)]);
        if(!isAuthorized(message)) {
            return;
        }
        const restricted = cmds.filter(cmd => this.isRestrictedCommand(cmd));
        message.reply(["you are also authorized to these restricted commands:", ...restricted.map(cmd => cmd.commandName)]);

    }

    @CommandNotFound()
    @Guard(NotBot)
    private notFound(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("command not found, show available commands with !commands");
        console.log("msg: ", message);
    }

    @On("ready")
    private ready() {
        console.log("Ready");
    }

    private getCommands() {
        return MetadataStorage.Instance.Ons.map(({params}) => params)
            .filter(cmd => cmd.commandName?.length);
    }

    private isRestrictedCommand(cmd) {
        return cmd.guards.some(guard => guard.params.fn === Authorize);
    }

    private queuePositionText(position: Number) {
        if(position == 0) {
            return "You are first in line.";
        }
        if(position == 1) {
            return "There is one person before you.";
        }
        return `There are ${position} people before you.`;
    }

    // TODO: test this
    private popImpl(student: ClientUser, message: CommandMessage) {
        const channel = message?.member.voice.channel;
        if(!channel) return;
        const member = student.presence.member;
        if(!member) return;
        try {
            member.voice.setChannel(channel, "It's your turn");
        } catch {
            // do nothing
        }
    }

    private showQueueImpl(queue: ClientUser[]) {
        if(queue.length == 0) return ["The queue is empty"];
        return queue.map((e, i) => `${i+1}. ${e.username}`);
    }
}
