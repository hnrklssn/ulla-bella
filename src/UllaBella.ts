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
        message.reply("You don't have permission to do that");
        return false;
    }
    return true;
}

@Discord({ prefix: "!", commandCaseSensitive: true })
abstract class AppDiscord {
    private helpQ = [];

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
            message.reply(["You are already in line for help.", "You can remove yourself from the queue with !removeHelp, or view the queue with !showHelp"]);
            return;
        }
        const len = this.helpQ.push(message.author);
        message.reply(["You are now in line for help.", this.queuePositionText(len-1)]);
    }

    @Command("nextHelp")
    @Guard(NotBot, Authorize)
    private popHelp(
        message: CommandMessage,
        client: Client
    ) {
        console.log("!nextHelp received");
        if(this.helpQ.length === 0) {
            message.reply("The help queue is empty.");
            return;
        }
        const student = this.helpQ.shift();
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
        message.reply(["This is the current help queue:", ...displayedQ]);
    }

    @Command("removeHelp")
    @Guard(NotBot)
    private removeHelp(
        message: CommandMessage,
        client: Client
    ) {
        if(!this.helpQ.includes(message.author)) {
            message.reply("You are not currently in line for help.");
            return;
        }
        this.helpQ = this.helpQ.filter((e) => e != message.author);
        message.reply("You have been removed from the help queue.");
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
        message.reply(["These are the available commands:", ...unrestricted.map(cmd => cmd.commandName)]);
        if(!isAuthorized(message)) {
            return;
        }
        const restricted = cmds.filter(cmd => this.isRestrictedCommand(cmd));
        message.reply(["You are also authorized to these restricted commands:", ...restricted.map(cmd => cmd.commandName)]);

    }

    @CommandNotFound()
    @Guard(NotBot)
    private notFound(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("Command not found, show available commands with !commands");
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

    // TODO: move student to voice channel
    private popImpl(student: ClientUser, message: CommandMessage) {
        message.reply(`The next person in line is ${student}.`);
    }

    // TODO: don't mention people
    private showQueueImpl(queue: ClientUser[]) {
        if(queue.length == 0) return ["The queue is empty"];
        return queue.map((e, i) => `${i+1}. ${e}`);
    }
}
