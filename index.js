const Telegraf = require('telegraf')
const bot = new Telegraf("your token")
const admin = ['<id chat of admin>']
const { exec } = require('child_process');

let loggedin = {}
let kill_process = {}

async function shell(cmd) {
	return new Promise((resolve, reject) => {
		exec(cmd, (err, stdout, stderr) => {
			resolve(stdout + stderr)
		});
	});
}
async function getId(id) {
	let stdout = await shell(`ps aux | grep sshd | grep "${id}" | grep -v grep`);
	let part = stdout.trim().replace(/ +/g, ' ').split(" ")
	return part[1]
}

async function checkLogin() {
	let stdout = await shell(`last`);
	let current_loggedin = {};
	let lines = stdout.split("\n").filter(line => line.indexOf("pts/")>0)
	lines.forEach(line => {
		line = line.replace(/ +/g, ' ')
		let info = line.split(' ')
		let username = info[0]
		let id = info[1]
		let ip = info[2]
		if ( line.indexOf("still logged in")>0 ) {
			current_loggedin[id] = { username, ip, id }
		}
	})
	for ( let id in loggedin ) {
		if ( !current_loggedin[id] ) {
			sendAdmin("logout "+JSON.stringify(loggedin[id]));
			delete loggedin[id];
		}
	}
	for ( let id in current_loggedin ) {
		if ( !loggedin[id] ) {
			const btnKill = Telegraf.Extra
			  .markdown()
			  .markup((m) => m.inlineKeyboard([
			    m.callbackButton('Kill', `kill-${id}`),
			    m.callbackButton('Allow', `allow-${id}`)
			  ]))
			sendAdmin("new login "+JSON.stringify(current_loggedin[id]), btnKill);
			loggedin[id] = current_loggedin[id];
			kill_process[id] = setTimeout(() => { killId(id) }, 10000)
		}
	}
}
async function killId(id) {
	let pid = await getId(id);
	if ( pid ) {
		shell(`kill -4 ${pid}`)
		sendAdmin(`kill ${id} ${pid}`)
	} else sendAdmin(`no process found ${id}`)
	clearTimeout(kill_process[ctx.match[1]])
	delete kill_process[ctx.match[1]]
}
function sendAdmin(message, extra=null) {
	console.log(message)
	for ( let id of admin ) {
		bot.telegram.sendMessage(id, message, extra)
	}
}

bot.action(/kill\-(.+)/, (ctx) => {
	killId(ctx.match[1])
})

bot.action(/allow\-(.+)/, (ctx) => {
	clearTimeout(kill_process[ctx.match[1]])
	delete kill_process[ctx.match[1]]
	sendAdmin(`allow ${ctx.match[1]}`)
})

bot.start((ctx) => {
	ctx.reply('Welcome! '+ctx.message.chat.id)
})
setInterval(checkLogin, 2000)
bot.launch()
