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
    @Command("hello")
    @Guard(NotBot)
    private hello(
        message: CommandMessage,
        client: Client
    ) {
        console.log("command received");
        message.reply("Hello!");
    }

    @CommandNotFound()
    @Guard(NotBot)
    private notFound(
        message: CommandMessage,
        client: Client
    ) {
        message.reply("Command not found");
    }

    @On("ready")
    private ready() {
        console.log("Ready");
    }
}
