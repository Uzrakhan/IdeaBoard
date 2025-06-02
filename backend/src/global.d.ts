// src/global.d.ts
declare module 'express' {
  import express = require('express');
  export = express;
}

declare module 'cors' {
  import cors = require('cors');
  export = cors;
}

declare module 'socket.io' {
  import { Server } from 'socket.io';
  export { Server };
}