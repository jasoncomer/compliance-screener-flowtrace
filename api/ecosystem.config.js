module.exports = {
  apps: [
    {
      name: 'api',
      script: 'npm',
      args: 'run prod',
      watch: ['./dist'],
      cwd: '/home/ubuntu/actions-runner/_work/blockscout-api/blockscout-api',
      ignore_watch: ['node_modules'],
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
};
