import os from 'os';
import { Utils } from '../src/utils';

jest.mock('os');

describe('Kenbot Action Tests', () => {
    afterEach(() => {
        delete process.env.KS_ACCESS_TOKEN;
        delete process.env.KS_USER;
        delete process.env.PASSWORD;
        delete process.env.KS_GIT_PROVIDER;
        delete process.env.KS_GIT_OWNER;
        delete process.env.GITHUB_REPOSITORY_OWNER;
        delete process.env.GITHUB_REPOSITORY;
    });

    describe('Kenbot URL Tests', () => {
        const myOs: jest.Mocked<typeof os> = os as any;
        let cases: string[][] = [
            [
                'win32' as NodeJS.Platform,
                'amd64',
                'khulnasoft.exe',
                'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-windows-amd64/khulnasoft.exe',
            ],
            ['darwin' as NodeJS.Platform, 'amd64', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-mac-386/khulnasoft'],
            ['linux' as NodeJS.Platform, 'amd64', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-linux-amd64/khulnasoft'],
            ['linux' as NodeJS.Platform, 'arm64', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-linux-arm64/khulnasoft'],
            ['linux' as NodeJS.Platform, '386', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-linux-386/khulnasoft'],
            ['linux' as NodeJS.Platform, 'arm', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-linux-arm/khulnasoft'],
            ['linux' as NodeJS.Platform, 'ppc64', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-linux-ppc64/khulnasoft'],
            ['linux' as NodeJS.Platform, 'ppc64le', 'khulnasoft', 'https://khulnasoft.github.io/kenbot/v1/1.2.3/kenbot-linux-ppc64le/khulnasoft'],
        ];

        test.each(cases)('CLI Url for %s-%s', (platform, arch, fileName, expectedUrl) => {
            myOs.platform.mockImplementation(() => <NodeJS.Platform>platform);
            myOs.arch.mockImplementation(() => arch);
            let cliUrl: string = Utils.getCliUrl('1', '1.2.3', fileName, '');
            expect(cliUrl).toBe(expectedUrl);
        });
    });

    describe('Kenbot URL Tests With Remote Artifactory', () => {
        const myOs: jest.Mocked<typeof os> = os as any;
        const releasesRepo: string = 'kenbot-remote';
        process.env['KS_URL'] = 'https://mykenbot.com/';
        process.env['KS_ACCESS_TOKEN'] = 'access_token1';
        let cases: string[][] = [
            [
                'win32' as NodeJS.Platform,
                'amd64',
                'khulnasoft.exe',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-windows-amd64/khulnasoft.exe',
            ],
            [
                'darwin' as NodeJS.Platform,
                'amd64',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-mac-386/khulnasoft',
            ],
            [
                'linux' as NodeJS.Platform,
                'amd64',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-linux-amd64/khulnasoft',
            ],
            [
                'linux' as NodeJS.Platform,
                'arm64',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-linux-arm64/khulnasoft',
            ],
            [
                'linux' as NodeJS.Platform,
                '386',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-linux-386/khulnasoft',
            ],
            [
                'linux' as NodeJS.Platform,
                'arm',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-linux-arm/khulnasoft',
            ],
            [
                'linux' as NodeJS.Platform,
                'ppc64',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-linux-ppc64/khulnasoft',
            ],
            [
                'linux' as NodeJS.Platform,
                'ppc64le',
                'khulnasoft',
                'https://mykenbot.com/artifactory/kenbot-remote/artifactory/kenbot/v2/2.8.7/kenbot-linux-ppc64le/khulnasoft',
            ],
        ];

        test.each(cases)('Remote CLI Url for %s-%s', (platform, arch, fileName, expectedUrl) => {
            myOs.platform.mockImplementation(() => <NodeJS.Platform>platform);
            myOs.arch.mockImplementation(() => arch);
            let cliUrl: string = Utils.getCliUrl('2', '2.8.7', fileName, releasesRepo);
            expect(cliUrl).toBe(expectedUrl);
        });
    });

    describe('Generate auth string', () => {
        it('Should return an empty string if releasesRepo is falsy', () => {
            const result = Utils.generateAuthString('');
            expect(result).toBe('');
        });

        it('Should generate a Bearer token if accessToken is provided', () => {
            process.env.KS_ACCESS_TOKEN = 'yourAccessToken';
            const result = Utils.generateAuthString('yourReleasesRepo');
            expect(result).toBe('Bearer yourAccessToken');
        });

        it('Should generate a Basic token if username and password are provided', () => {
            process.env.KS_USER = 'yourUsername';
            process.env.KS_PASSWORD = 'yourPassword';
            const result = Utils.generateAuthString('yourReleasesRepo');
            expect(result).toBe('Basic eW91clVzZXJuYW1lOnlvdXJQYXNzd29yZA==');
        });

        it('Should return an empty string if no credentials are provided', () => {
            const result = Utils.generateAuthString('yourReleasesRepo');
            expect(result).toBe('');
        });
    });

    it('Repository env tests', () => {
        process.env['GITHUB_REPOSITORY_OWNER'] = 'khulnasoft';
        process.env['GITHUB_REPOSITORY'] = 'khulnasoft/kenbot';
        Utils.setKenbotEnv();
        expect(process.env['KS_GIT_PROVIDER']).toBe('github');
        expect(process.env['KS_GIT_OWNER']).toBe('khulnasoft');
    });
});
