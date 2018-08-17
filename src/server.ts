const express = require('express');
import * as readline from "readline";

readline.createInterface({
  input: process.stdin
}).on('line', line => {
  console.log("LINE")
})