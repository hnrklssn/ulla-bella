import { Client } from "@typeit/discord";
import "reflect-metadata";

function start() {
    if(!process.env.DISCORD_TOKEN) {
        console.log("Please set DISCORD_TOKEN");
        return;
    }
    console.log("Starting client...");
    const client = new Client();
    client.login(
        process.env.DISCORD_TOKEN,
        `${__dirname}/UllaBella.ts` // glob string to load the classes
    );
}

start();
