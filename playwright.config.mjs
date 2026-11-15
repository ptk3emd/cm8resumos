import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
 testDir:'./tests',timeout:45000,
 retries:process.env.CI?1:0,
 use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
  {name:'android-chromium',use:{...devices['Pixel 7']}},
  {name:'ios-webkit',use:{...devices['iPhone 13']}}
 ],
 webServer:{
  command:'python3 -m http.server 4173 --bind 127.0.0.1',
  url:'http://127.0.0.1:4173/',
  reuseExistingServer:!process.env.CI,
  timeout:30000
 }
});
