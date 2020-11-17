import * as React from 'react';
import { toSlug } from '@mono/utils';

export interface ThingProps {
  message: string;
}

export function Thing(props: ThingProps) {
  return <>{toSlug(props.message)}</>;
}
