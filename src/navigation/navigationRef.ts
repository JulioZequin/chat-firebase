import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();
