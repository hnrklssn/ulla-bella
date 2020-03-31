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
    return message.member?.roles.some(role => role.name === 'labbledare');
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
abstract class UllaBella {
    private helpQ: User[][] = [];
    private presentQ: User[][] = [];

    @Command("hello", {infos: "hidden"})
    @Command("hallå", {infos: "hidden"})
    @Command("hej", {infos: "hidden"})
    private hello(
        message: CommandMessage,
        client: Client
    ) {
        message.channel.send({embed: {title: "hallååååå! Det här är Ulla-Bella, min sekreterare!", url: "https://www.oppetarkiv.se/video/18326542/solstollarna"}});
    }

    private isInQueue(student: User, q: User[][]): Boolean {
        return q.some(pair => pair.includes(student));
    }

    private EnqueueGuard(message: Message) {
        if(this.isInQueue(message.author, this.helpQ)) {
            message.reply(["you are already in line for help.", "You can remove yourself from the queue with !removeHelp, or view the queue with !showHelp"]);
            return false;
        }
        if(this.isInQueue(message.author, this.presentQ)) {
            message.reply(["you are already in line to present.", "You can remove yourself from the queue with !removePresent, or view the queue with !showPresent"]);
            return false;
        }
        const coQueuers = [...message.mentions.users.values()];
        const inHelpQ = coQueuers.filter(student => this.isInQueue(student, this.helpQ));
        const inPresentQ = coQueuers.filter(student => this.isInQueue(student, this.presentQ));
        if(inHelpQ.length === 0 && inPresentQ.length === 0) return true;
        if(inHelpQ.length === 1) {
            message.reply(`the following lab partner is already in the help queue: ${inHelpQ[0]}`);
        } else if(inHelpQ.length) {
            message.reply(`the following lab partners are already in the help queue: ${inHelpQ}`);
        }
        if(inPresentQ.length === 1) {
            message.reply(`the following lab partner is already in the presentation queue: ${inPresentQ[0]}`);
        } else if(inPresentQ.length) {
            message.reply(`the following lab partners are already in the presentation queue: ${inPresentQ}`);
        }
        return false;
    }

    @Command("askForHelp", {description: " [*@labpartner*] - place yourself and your labpartner in the help queue"})
    @Command("helpMe", {infos: "hidden"})
    @Command("hjälpMig", {infos: "hidden"})
    private addHelp(
        message: CommandMessage,
        client: Client
    ) {
        if(!this.EnqueueGuard(message)) return;
        const coQueuers = [...message.mentions.users.values()]
            .filter(user => !user.bot && user.id != message.author.id);
        const labgroup = [message.author, ...coQueuers];
        const len = this.helpQ.push(labgroup);
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

    @Command("askToPresent", {description: " [*@labpartner*] - place yourself and your labpartner in the presentation queue"})
    @Command("present", {infos: "hidden"})
    @Command("redovisa", {infos: "hidden"})
    private addPresenter(
        message: CommandMessage,
        client: Client
    ) {
        if(!this.EnqueueGuard(message)) return;
        const coQueuers = [...message.mentions.users.values()]
            .filter(user => !user.bot && user.id != message.author.id);
        const labgroup = [message.author, ...coQueuers];
        const len = this.presentQ.push(labgroup);
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

    @Command("removeMe", {description: " - remove yourself and your lab partner from the queue you are in"})
    @Command("remove", {infos: "hidden"})
    @Command("nvm", {infos: "hidden"})
    @Command("leaveQueue", {infos: "hidden"})
    @Command("slutaKöa", {infos: "hidden"})
    private removePresent(
        message: CommandMessage,
        client: Client
    ) {
        const inPresent = this.isInQueue(message.author, this.presentQ);
        const inHelp = this.isInQueue(message.author, this.helpQ);
        if(!inPresent && !inHelp) {
            message.reply("you are not currently in any queue.");
            return;
        }
        
        if(inPresent) {
            this.presentQ = this.presentQ.filter((pair) => !pair.includes(message.author));
            message.reply("you have been removed from the presentation queue.");
        }
        if(inHelp) {
            this.helpQ = this.helpQ.filter((pair) => !pair.includes(message.author));
            message.reply("you have been removed from the help queue.");
        }
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
            `**${cmd.prefix}${cmd.commandName}**${cmd.description}`)]);
        if(!isAuthorized(message)) {
            return;
        }
        const restricted = cmds.filter(cmd => this.isRestrictedCommand(cmd));
        message.reply(["you are also authorized to these restricted commands:", ...restricted.map(cmd =>
            `**${cmd.prefix}${cmd.commandName}**${cmd.description}`)]);

    }

    @Command("code", {description: " - get my source code"})
    @Command("kod", {infos: "hidden"})
    @Command("github", {infos: "hidden"})
    private sourceCode(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("you can find my source code here: https://github.com/hnrklssn/ulla-bella");
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
        /*const channel = message?.member.voice.channel;
        if(!channel) return;
        students.forEach(student => {
            const member = student.presence.member;
            if(!member) return;
            //member.voice.setChannel(channel, "It's your turn").catch(console.error);
        });*/
    }

    private showQueueImpl(queue: User[][]) {
        if(queue.length == 0) return ["The queue is empty"];
        return queue.map((students, i) => `${i+1}. ${students.map(u => u.username).join(", ")}`);
    }
}
