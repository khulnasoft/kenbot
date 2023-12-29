import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { context as githubContext } from '@actions/github';
import { downloadTool, find, cacheFile } from '@actions/tool-cache';
import { chmodSync } from 'fs';
import { platform, arch } from 'os';
import { normalize, join } from 'path';
import { BranchSummary, SimpleGit, simpleGit } from 'simple-git';

export class Utils {
    private static readonly LATEST_RELEASE_VERSION: string = '[RELEASE]';
    private static readonly LATEST_CLI_VERSION_ARG: string = 'latest';
    private static readonly VERSION_ARG: string = 'version';
    private static readonly TOOL_NAME: string = 'kenbot';

    public static async addToPath() {
        let fileName: string = Utils.getExecutableName();
        let version: string = core.getInput(Utils.VERSION_ARG);
        let major: string = version.split('.')[0];
        if (version === this.LATEST_CLI_VERSION_ARG) {
            version = Utils.LATEST_RELEASE_VERSION;
            major = '2';
        } else {
            if (this.loadFromCache(version)) {
                // Download is not needed
                return;
            }
        }

        // Download Kenbot
        const releasesRepo: string = process.env.KS_RELEASES_REPO ?? '';
        let url: string = Utils.getCliUrl(major, version, fileName, releasesRepo);
        core.debug('Downloading Kenbot from ' + url);
        let auth: string = this.generateAuthString(releasesRepo);
        let downloadDir: string = await downloadTool(url, '', auth);
        // Cache 'kenbot' executable
        await this.cacheAndAddPath(downloadDir, version, fileName);
    }

    public static generateAuthString(releasesRepo: string): string {
        if (!releasesRepo) {
            return '';
        }
        let accessToken: string = process.env.KS_ACCESS_TOKEN ?? '';
        let username: string = process.env.KS_USER ?? '';
        let password: string = process.env.KS_PASSWORD ?? '';
        if (accessToken) {
            return 'Bearer ' + Buffer.from(accessToken).toString();
        } else if (username && password) {
            return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
        }
        return '';
    }

    public static async setKenbotEnv() {
        core.exportVariable('KS_GIT_PROVIDER', 'github');
        core.exportVariable('KS_GIT_OWNER', githubContext.repo.owner);
        let owner: string | undefined = githubContext.repo.repo;
        if (owner) {
            core.exportVariable('KS_GIT_REPO', owner.substring(owner.indexOf('/') + 1));
        }
        core.exportVariable('KS_GIT_PULL_REQUEST_ID', githubContext.issue.number);
        return githubContext.eventName;
    }

    /**
     * Execute kenbot scan-pull-request command.
     */
    public static async execScanPullRequest() {
        if (!process.env.KS_GIT_BASE_BRANCH) {
            core.exportVariable('KS_GIT_BASE_BRANCH', githubContext.ref);
        }
        let res: number = await exec(Utils.getExecutableName(), ['scan-pull-request']);
        if (res !== core.ExitCode.Success) {
            throw new Error('Kenbot exited with exit code ' + res);
        }
    }

    /**
     * Execute kenbot scan-repository command.
     */
    public static async execCreateFixPullRequests() {
        if (!process.env.KS_GIT_BASE_BRANCH) {
            // Get the current branch we are checked on
            const git: SimpleGit = simpleGit();
            try {
                const currentBranch: BranchSummary = await git.branch();
                core.exportVariable('KS_GIT_BASE_BRANCH', currentBranch.current);
            } catch (error) {
                throw new Error('Error getting current branch from the .git folder: ' + error);
            }
        }

        let res: number = await exec(Utils.getExecutableName(), ['scan-repository']);
        if (res !== core.ExitCode.Success) {
            throw new Error('Kenbot exited with exit code ' + res);
        }
    }

    /**
     * Try to load the Kenbot executables from cache.
     *
     * @param version  - Kenbot version
     * @returns true if the CLI executable was loaded from cache and added to path
     */
    private static loadFromCache(version: string): boolean {
        let execPath: string = find(Utils.TOOL_NAME, version);
        if (execPath) {
            core.addPath(execPath);
            return true;
        }
        return false;
    }

    /**
     * Add Kenbot executable to cache and to the system path.
     * @param downloadDir - The directory whereby the CLI was downloaded to
     * @param version     - Kenbot version
     * @param fileName    - 'kenbot' or 'kenbot.exe'
     */
    private static async cacheAndAddPath(downloadDir: string, version: string, fileName: string) {
        let cliDir: string = await cacheFile(downloadDir, fileName, Utils.TOOL_NAME, version);
        if (!Utils.isWindows()) {
            let filePath: string = normalize(join(cliDir, fileName));
            chmodSync(filePath, 0o555);
        }
        core.addPath(cliDir);
    }

    public static getCliUrl(major: string, version: string, fileName: string, releasesRepo: string): string {
        let architecture: string = 'kenbot-' + Utils.getArchitecture();
        if (releasesRepo) {
            let platformUrl: string = process.env.KS_URL ?? '';
            if (!platformUrl) {
                throw new Error('Failed while downloading Kenbot from Artifactory, KS_URL must be set');
            }
            // Remove trailing slash if exists
            platformUrl = platformUrl.replace(/\/$/, '');
            return `${platformUrl}/artifactory/${releasesRepo}/artifactory/kenbot/v${major}/${version}/${architecture}/${fileName}`;
        }
        return `https://khulnasoft.github.io/kenbot/v${major}/${version}/${architecture}/${fileName}`;
    }

    public static getArchitecture() {
        if (Utils.isWindows()) {
            return 'windows-amd64';
        }
        if (platform().includes('darwin')) {
            return 'mac-386';
        }
        if (arch().includes('arm')) {
            return arch().includes('64') ? 'linux-arm64' : 'linux-arm';
        }
        if (arch().includes('ppc64le')) {
            return 'linux-ppc64le';
        }
        if (arch().includes('ppc64')) {
            return 'linux-ppc64';
        }
        return arch().includes('64') ? 'linux-amd64' : 'linux-386';
    }

    public static getExecutableName() {
        return Utils.isWindows() ? 'kenbot.exe' : 'kenbot';
    }

    public static isWindows() {
        return platform().startsWith('win');
    }
}
