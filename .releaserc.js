module.exports = {
    branches: ['main', { name: 'dev', prerelease: true }],
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
        '@semantic-release/npm',
        [
            '@semantic-release/git',
            {
                // eslint-disable-next-line no-template-curly-in-string
                message: 'chore: release ${nextRelease.version} [skip ci]'
            }
        ],
        '@semantic-release/github'
    ]
};
