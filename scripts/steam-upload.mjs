// Upload the Steam depot (release-steam/win-unpacked, built by npm run dist:steam) with SteamCMD.
//   npm run steam:upload -- --user <build account> [--live beta] [--desc "notes"] [--dry]
// Writes release-steam/app_build.vdf from package.json "steam" (appId, and depotId: the first depot,
// appId + 1 unless set) and runs `steamcmd +login <user> +run_app_build <vdf> +quit`, which asks for
// the password and Steam Guard code itself. --live sets the build live on that branch; Steam never
// lets an upload go live on the default branch, so do that in Steamworks after testing the beta.
// --dry only writes the .vdf and prints the command. STEAMCMD names the steamcmd executable.
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const dry = args.includes('--dry');
const fail = (msg) => { console.error('steam:upload: ' + msg); process.exit(1); };

const appId = Number(pkg.steam?.appId) || 0;
const depotId = Number(pkg.steam?.depotId) || appId + 1;
if (!appId) fail('set "steam": { "appId": <your App ID> } in package.json (Steamworks -> App Admin shows it).');
const live = opt('live') ?? '';
if (live === 'default') fail('Steam does not allow uploads to go live on the default branch. Use a beta branch, then set it live in Steamworks.');
const content = path.join(ROOT, 'release-steam', 'win-unpacked');
if (!fs.existsSync(path.join(content, 'Lost Marcus.exe'))) fail('no depot yet: run npm run dist:steam (on Windows) first.');
if (!fs.existsSync(path.join(content, 'steam_api64.dll'))) fail('the depot has no steam_api64.dll: rebuild it with npm run dist:steam.');

// No test App ID files in the depot: Steam supplies the App ID to the game it launches.
for (const f of ['steam_appid.txt']) if (fs.existsSync(path.join(content, f))) fail(`remove ${f} from the depot before uploading.`);

// forward slashes: Windows takes them, and SteamCMD's .vdf reader never sees an escape sequence
const q = (s) => `"${String(s).replace(/\\/g, '/').replace(/"/g, "'")}"`;
const out = path.join(ROOT, 'release-steam', 'steam-output');
fs.mkdirSync(out, { recursive: true });
const vdf = `"AppBuild"
{
	"AppID"	${q(appId)}
	"Desc"	${q(opt('desc') ?? `Lost Marcus v${pkg.version}`)}
	"ContentRoot"	${q(content)}
	"BuildOutput"	${q(out)}
	"SetLive"	${q(live)}
	"Depots"
	{
		${q(depotId)}
		{
			"FileMapping"
			{
				"LocalPath"	"*"
				"DepotPath"	"."
				"recursive"	"1"
			}
			"FileExclusion"	"*.pdb"
		}
	}
}
`;
const file = path.join(ROOT, 'release-steam', 'app_build.vdf');
fs.writeFileSync(file, vdf);
console.log(`wrote ${path.relative(ROOT, file)} (app ${appId}, depot ${depotId}${live ? `, live on ${live}` : ''})`);

const user = opt('user') ?? process.env.STEAM_USERNAME;
const steamcmd = process.env.STEAMCMD || 'steamcmd';
const cmd = [steamcmd, '+login', user ?? '<build account>', '+run_app_build', file, '+quit'];
if (dry || !user) {
  console.log((user ? '' : 'no --user given; ') + 'upload with:\n  ' + cmd.map((c) => (/\s/.test(c) ? q(c) : c)).join(' '));
  process.exit(0);
}
const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
if (r.error) fail(`could not run ${steamcmd} (${r.error.message}). Install SteamCMD from the Steamworks SDK, or set STEAMCMD.`);
process.exit(r.status ?? 1);
