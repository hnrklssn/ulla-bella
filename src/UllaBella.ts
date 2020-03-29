import {
    Discord,
    On,
    Client,
    Command,
    CommandMessage,
    CommandNotFound,
    Guard,
} from "@typeit/discord";
import { Message } from "discord.js";

function NotBot(message: Message, client: Client) {
    return client?.user?.id !== message.author.id;
}
@Discord({ prefix: "!" })
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

    @Command("help")
    @Guard(NotBot)
    private addHelp(
        message: CommandMessage,
        client: Client
    ) {
        console.log("!help received");
        if(this.helpQ.includes(message.author)) {
            message.reply(["You are already in line for help.", "You can remove yourself from the queue with !removeHelp, or view the queue with !showHelp"]);
            return;
        }
        const len = this.helpQ.push(message.author);
        message.reply(["You are now in line for help.", this.queuePositionText(len-1)]);
    }

    @CommandNotFound()
    @Guard(NotBot)
    private notFound(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("Command not found");
        console.log("msg: ", message);
    }

    @On("ready")
    private ready() {
        console.log("Ready");
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
}
