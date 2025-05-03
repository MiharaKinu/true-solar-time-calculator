# True Solar Time Calculator

![version](https://img.shields.io/npm/v/true-solar-time-calculator?color=yellow&label=version)
![license-MIT](https://img.shields.io/badge/license-MIT-green.svg) 

> A TypeScript utility for calculating **True Solar Time** and **Equation of Time** based on date and geographic coordinates (longitude, latitude).  
> 计算真太阳时（True Solar Time）与时间均差（Equation of Time）的 TypeScript 工具库。

## 📦 Installation

```bash
npm install true-solar-time-calculator
````

or

```bash
yarn add true-solar-time-calculator
```

## 🚀 Usage

```ts
import { TrueSolarTimeCalculator } from 'true-solar-time-calculator';

const localLongitude = 104.020721;
const localLatitude = 34.429150;
const now = new Date();

const calculator = new TrueSolarTimeCalculator(now, localLongitude, localLatitude);

console.log(`Input Date (UTC): ${calculator.utcDate.toISOString()}`);
console.log(`Longitude: ${calculator.longitude}°`);
console.log(`Latitude: ${calculator.latitude}°`);
console.log(`Julian Day: ${calculator.julianDay.toFixed(5)}`);
console.log(`Equation of Time: ${calculator.getHumanReadableEOT()}`);
console.log(`True Solar Time (ISO): ${calculator.trueSolarTime().getDate().toISOString()}`);
console.log(`True Solar Time (Formatted): ${calculator.trueSolarTime().format()}`);
console.log(`True Solar Time (HH:MM:SS): ${calculator.getTrueSolarTimeString()}`);
```

## 🛠 API

### `new TrueSolarTimeCalculator(inputDate: Date, longitude: number, latitude: number)`

| Parameter   | Type     | Description                                    |
| ----------- | -------- | ---------------------------------------------- |
| `inputDate` | `Date`   | UTC date-time to calculate true solar time for |
| `longitude` | `number` | Longitude in degrees (−180° to +180°)          |
| `latitude`  | `number` | Latitude in degrees (−90° to +90°)             |

### Properties & Methods

| Method                          | Returns  | Description                                        |
| ------------------------------- | -------- | -------------------------------------------------- |
| `utcDate`                       | `Date`   | The UTC input date                                 |
| `julianDay`                     | `number` | Julian Day number                                  |
| `equationOfTimeSeconds`         | `number` | Equation of time in seconds                        |
| `getHumanReadableEOT()`         | `string` | Human-readable EOT (e.g., `2分30秒`)                 |
| `trueSolarTime()`               | `this`   | Computes true solar time (chainable)               |
| `getDate()`                     | `Date`   | Date object of True Solar Time                     |
| `format(formatString?: string)` | `string` | Formats TST date as string (`YYYY-MM-DD HH:mm:ss`) |
| `getTrueSolarTimeString()`      | `string` | Returns TST as `HH:MM:SS`                          |

## 📄 License

MIT © [miharakinu](https://github.com/miharakinu)

---