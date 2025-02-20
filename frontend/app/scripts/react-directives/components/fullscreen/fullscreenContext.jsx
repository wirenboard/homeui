'use strict';

import { createContext } from 'react';
import { FullscreenStore } from './fullscreenStore';

export const FullscreenContext = createContext(new FullscreenStore());
