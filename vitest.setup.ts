import '@testing-library/jest-dom/vitest';

// Headless Web Audio API Mock for Node/jsdom Vitest environment
class MockAudioParam {
  value: number = 0;
  setValueAtTime(val: number, _startTime: number): void {
    this.value = val;
  }
  linearRampToValueAtTime(val: number, _endTime: number): void {
    this.value = val;
  }
  exponentialRampToValueAtTime(val: number, _endTime: number): void {
    this.value = val;
  }
  setTargetAtTime(val: number, _startTime: number, _timeConstant: number): void {
    this.value = val;
  }
  cancelScheduledValues(_startTime: number): void {}
}

class MockGainNode {
  gain = new MockAudioParam();
  connect(dest: any, _outputIndex?: number, _inputIndex?: number): any {
    return dest;
  }
  disconnect(): void {}
}

class MockOscillatorNode {
  frequency = new MockAudioParam();
  type: OscillatorType = 'sine';
  connect(dest: any, _outputIndex?: number, _inputIndex?: number): any {
    return dest;
  }
  disconnect(): void {}
  start(_when?: number): void {}
  stop(_when?: number): void {}
}

class MockChannelMergerNode {
  connect(dest: any, _outputIndex?: number, _inputIndex?: number): any {
    return dest;
  }
  disconnect(): void {}
}

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime: number = 0;
  destination: any = {};

  createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode();
  }

  createGain(): MockGainNode {
    return new MockGainNode();
  }

  createChannelMerger(_numberOfInputs?: number): MockChannelMergerNode {
    return new MockChannelMergerNode();
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// Polyfill AudioContext globally for both browser-like window and node global
if (typeof window !== 'undefined') {
  (window as any).AudioContext = MockAudioContext;
  (window as any).webkitAudioContext = MockAudioContext;
}
if (typeof global !== 'undefined') {
  (global as any).AudioContext = MockAudioContext;
  (global as any).webkitAudioContext = MockAudioContext;
}
