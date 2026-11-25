import {contourShape, shellPath} from '../src/geometry';
import type {TextLensPose} from './text-lens-motion';

export function textLensOutline({width, height}: Pick<TextLensPose, 'width' | 'height'>) {
  const rimInset = 2;
  return shellPath({
    ...contourShape(width - 2 * rimInset, height - 2 * rimInset, 2.65),
    x: width / 2,
    y: height / 2
  });
}
