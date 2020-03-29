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
import { ClientUser, Message, User } from "discord.js";

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
    private helpQ: User[][] = [];
    private presentQ: User[][] = [];

    @Command("hello")
    @Guard(NotBot)
    private hello(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("hallååååå! Det här är Ulla-Bella, min sekreterare!");
    }

    @Command("askForHelp")
    @Guard(NotBot)
    private addHelp(
        message: CommandMessage,
        client: Client
    ) {
        if(this.helpQ.some(pair => pair.includes(message.author))) {
            message.reply(["you are already in line for help.", "You can remove yourself from the queue with !removeHelp, or view the queue with !showHelp"]);
            return;
        }
        console.log("mentions: ", message.mentions);
        const coQueuers = [...message.mentions.users.values()];
        const len = this.helpQ.push([message.author, ...coQueuers]);
        if(coQueuers.length) {
            message.reply([`you are now in line for help with ${coQueuers.join(", ")}.`,
                this.queuePositionText(len-1)]);
        } else {
            message.reply(["you are now in line for help.",
                this.queuePositionText(len-1),
                "Tip: you can queue together with your lab partner by mentioning them when asking for help."
            ]);
        }
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
        const students = this.helpQ.shift();
        if(students.length === 1) {
            message.reply(`the next person in line is ${students[0]}.`);
        } else {
            message.reply(`the next people in line are ${students.join(", ")}.`);
        }
        this.popImpl(students, message);
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
        if(!this.helpQ.some(pair => pair.includes(message.author))) {
            message.reply("you are not currently in line for help.");
            return;
        }
        this.helpQ = this.helpQ.filter((pair) => !pair.includes(message.author));
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
        console.log(this.presentQ.some(pair => pair.includes(message.author)))
        if(this.presentQ.some(pair => pair.includes(message.author))) {
            message.reply(["you are already in line to present.", "You can remove yourself from the queue with !removePresent, or view the queue with !showPresent"]);
            return;
        }
        const coQueuers = [...message.mentions.users.values()];
        const len = this.presentQ.push([message.author, ...coQueuers]);
        if(coQueuers.length) {
            message.reply([`you are now in line to present with ${coQueuers.join(", ")}.`,
                this.queuePositionText(len-1)]);
        } else {
            message.reply(["you are now in line to present.",
                this.queuePositionText(len-1),
                "Tip: you can queue together with your lab partner by mentioning them when asking to present."
            ]);
        }
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
        const students = this.presentQ.shift();
        if(students.length === 1) {
            message.reply(`the next person in line is ${students[0]}.`);
        } else {
            message.reply(`the next people in line are ${students.join(", ")}.`);
        }
        this.popImpl(students, message);
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
        if(!this.presentQ.some(pair => pair.includes(message.author))) {
            message.reply("you are not currently in line to present.");
            return;
        }
        this.presentQ = this.presentQ.filter((pair) => !pair.includes(message.author));
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
        let students;
        if(this.presentQ.length > this.helpQ.length * 3) {
            students = this.presentQ.shift();
            if(students.length === 1) {
                message.reply(`the next person in line is ${students[0]}. They want to present.`);
            } else {
                message.reply(`the next people in line are ${students.join(", ")}. They want to present.`);
            }
        } else {
            students = this.helpQ.shift();
            if(students.length === 1) {
                message.reply(`the next person in line is ${students[0]}. They want help.`);
            } else {
                message.reply(`the next people in line are ${students.join(", ")}. They want help.`);
            }
        }
        this.popImpl(students, message);
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
        message.reply("command not found. Show available commands with !commands");
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

    // TODO: figure out a way to get this to work
    private popImpl(students: User[], message: CommandMessage) {
        const channel = message?.member.voice.channel;
        if(!channel) return;
        students.forEach(student => {
            const member = student.presence.member;
            if(!member) return;
            //member.voice.setChannel(channel, "It's your turn").catch(console.error);
        });
    }

    private showQueueImpl(queue: User[][]) {
        if(queue.length == 0) return ["The queue is empty"];
        return queue.map((students, i) => `${i+1}. ${students.join(", ")}`);
    }
}
