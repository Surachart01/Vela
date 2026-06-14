const axios = require("axios");
const { pool } = require("../initial");
const e = require("express");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");




const InsertLogLogin = async () => {
  try {
    await pool.query("BEGIN");
    const queryStr = `
     
    `;
    const queryValues = [];

    await pool.query(queryStr, queryValues);
    await pool.query("COMMIT");

    return { status: 200, msg: "success" };
  } catch (error) {
    await pool.query("ROLLBACK");
    console.log(error);
    return { status: 400, msg: "ERROR", error };
  }
};















module.exports = {

};