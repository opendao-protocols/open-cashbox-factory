
// import { HttpClient, HttpXhrBackend } from '@angular/common/http';

import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js';


export function getNumber(hexNum) {
    return ethers.utils.bigNumberify(hexNum).toString();
}

// convert 0 -> 0.000...
export function toDecimal(val, decimal) {
    if (val === undefined || val === null) { return '0'; }
    val = val.toString();
    val = new BigNumber(val);
    return val.toFixed(decimal);
}

// toDecimalDisplay -- convert 0 -> 0
export function toDecimalDisp(val, decimal) {
    if (val === undefined || val === null) { return '0'; }
    val = val.toString();
    val = new BigNumber(val);

    if (val.isZero()) { return '0'; }
    return val.toFixed(decimal);
}

export function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}
export function localeString(num, precision) {
    if (num === null || num === undefined) { return; }

    num = parseFloat(num);
    num = num.toLocaleString(undefined, { maximumFractionDigits: precision });
    return num;
}

export function decimalsToToken(amount, decimals) {
    const amt = new BigNumber(amount);
    const dec = new BigNumber(decimals);
    const ten = new BigNumber(10);

    const result = amt.div(ten.pow(dec));
    return result.toFixed();
}

export function tokenToDecimals(amount, decimals) {
    const amt = new BigNumber(amount);
    const dec = new BigNumber(decimals);
    const ten = new BigNumber(10);

    const result = amt.times(ten.pow(dec));
    return result.toFixed();
}