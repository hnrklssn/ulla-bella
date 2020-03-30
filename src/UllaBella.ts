import {
    Discord,
    On,
    Client,
    Command,
    CommandMessage,
    CommandNotFound,
    Guard,
    ICommandInfos,
    MetadataStorage,
} from "@typeit/discord";
import { ClientUser, Message, User } from "discord.js";

function isAuthorized(message: Message) {
    return message.member?.roles.cache.some(role => role.name === 'labbledare');
}

function Authorize(message: Message, client: Client) {
    if(!isAuthorized(message)) {
        message.reply("you don't have permission to do that");
        return false;
    }
    return true;
}

type CommandSettings = "restricted" | "hidden" | undefined;

@Discord({ prefix: "!", commandCaseSensitive: true })
abstract class AppDiscord {
    private helpQ: User[][] = [];
    private presentQ: User[][] = [];

    @Command("hello", {infos: "hidden"})
    @Command("hallå", {infos: "hidden"})
    @Command("hej", {infos: "hidden"})
    private hello(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("hallååååå! Det här är Ulla-Bella, min sekreterare!");
    }

    @Command("askForHelp", {description: " [@labpartner] - place yourself and your labpartner in the help queue"})
    @Command("helpMe", {infos: "hidden"})
    @Command("hjälpMig", {infos: "hidden"})
    private addHelp(
        message: CommandMessage,
        client: Client
    ) {
        if(this.helpQ.some(pair => pair.includes(message.author))) {
            message.reply(["you are already in line for help.", "You can remove yourself from the queue with !removeHelp, or view the queue with !showHelp"]);
            return;
        }
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

    @Command("nextHelp", {infos: "restricted", description: " - pick the next student, specifically from the help queue"})
    @Guard(Authorize)
    private popHelp(
        message: CommandMessage,
        client: Client
    ) {
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

    @Command("showHelp", {description: " - show the current help queue"})
    @Command("visaHjälp", {infos: "hidden"})
    private showHelp(
        message: CommandMessage,
        client: Client
    ) {
        const displayedQ = this.showQueueImpl(this.helpQ);
        message.reply(["this is the current help queue:", ...displayedQ]);
    }

    @Command("removeHelp", {description: " - remove yourself and your lab partner from the help queue"})
    @Command("gåUrHjälp", {infos: "hidden"})
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
    @Command("askToPresent", {description: " [@labpartner] - place yourself and your labpartner in the presentation queue"})
    @Command("present", {infos: "hidden"})
    @Command("redovisa", {infos: "hidden"})
    private addPresenter(
        message: CommandMessage,
        client: Client
    ) {
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

    @Command("nextPresent", {infos: "restricted", description: " - pick the next student, specifically from the presentation queue"})
    @Guard(Authorize)
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

    @Command("showPresent", {description: " - show the current help queue"})
    @Command("visaRedovisa", {infos: "hidden"})
    private showPresenters(
        message: CommandMessage,
        client: Client
    ) {
        const displayedQ = this.showQueueImpl(this.presentQ);
        message.reply(["this is the current presentation queue:", ...displayedQ]);
    }

    @Command("removePresent", {description: " - remove yourself and your lab partner from the presentation queue"})
    @Command("slutaRedovisa", {infos: "hidden"})
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

    @Command("next", {infos: "restricted", description: " - automatically select the next student from either the help queue or the presentation queue"})
    @Guard(Authorize)
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

    @Command("commands", {description: " - show this message"})
    @Command("help", {infos: "hidden"})
    @Command("hapl", {infos: "hidden"})
    @Command("hjälp", {infos: "hidden"})
    @Command("kommandon", {infos: "hidden"})
    private commands(
        message: CommandMessage,
        client: Client
    ) {
        const cmds = this.getCommands().filter(cmd => !this.isHiddenCommand(cmd));
        const unrestricted = cmds.filter(cmd => !this.isRestrictedCommand(cmd));
        message.reply(["these are the available commands:", ...unrestricted.map(cmd =>
            `${cmd.prefix}${cmd.commandName}${cmd.description}`)]);
        if(!isAuthorized(message)) {
            return;
        }
        const restricted = cmds.filter(cmd => this.isRestrictedCommand(cmd));
        message.reply(["you are also authorized to these restricted commands:", ...restricted.map(cmd =>
            `${cmd.prefix}${cmd.commandName}${cmd.description}`)]);

    }

    @CommandNotFound()
    private notFound(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("command not found. Show available commands with !commands");
    }

    @On("ready")
    private ready() {
        console.log("Ready");
    }

    private getCommands(): ICommandInfos<CommandSettings>[] {
        return Client.getCommands<CommandSettings>();
    }

    private isRestrictedCommand(cmd: ICommandInfos<CommandSettings>): Boolean {
        return cmd.infos === "restricted";
    }

    private isHiddenCommand(cmd: ICommandInfos<CommandSettings>): Boolean {
        return cmd.infos === "hidden";
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
        return queue.map((students, i) => `${i+1}. ${students.map(u => u.username).join(", ")}`);
    }
}
