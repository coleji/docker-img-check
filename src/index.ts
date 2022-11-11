import {exec} from 'child_process'

const [containerName, imageName, cmdIfNoMatch] = process.argv.slice(4);

function execCmd(cmd: string, passThrough?: any[]) {
	return new Promise<any>((resolve, reject) => {
		exec(cmd, function(err, stdout, stderr) {
			if (err) reject(err);
			else {
				if (passThrough && passThrough.length > 0) resolve([stdout.trim()].concat(passThrough));
				else resolve(stdout.trim());
			}
		})
	})
}

execCmd(`docker ps | grep ${containerName} | awk '{print $1}'`)
.then(containerId => execCmd(`docker inspect ${containerId} | grep '"Image": "sha256:'`))
.then((imageString) => {
	const regex = /^"Image": "sha256:(.{12})(.{52})",$/
	const result = regex.exec(imageString);
	if (result && result[1]) return Promise.resolve(result[1])
	else return Promise.reject("no regex match for " + imageString)
}).then(liveImageId => execCmd(`docker pull ${imageName}`, [liveImageId]))
.then(([_, liveImageId]) => execCmd(`docker image inspect ${imageName} | grep '"Id": "sha256:'`, [liveImageId]))
.then(([imageString, liveImageId]) => {
	const regex = /^"Id": "sha256:(.{12})(.{52})",$/
	const result = regex.exec(imageString);
	if (result && result[1]) return Promise.resolve([result[1], liveImageId])
	else return Promise.reject("no regex match for " + imageString)
}).then(([newImageId, liveImageId]) => {
	console.log(newImageId)
	console.log(liveImageId)
	if (newImageId == liveImageId) {
		console.log("image is up to date. ")
		return Promise.resolve()
	} else {
		console.log("executing ", cmdIfNoMatch)
		return execCmd(cmdIfNoMatch)
	}
})
.catch(err => console.error(err))
