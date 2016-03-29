module.exports = function (msg) {
    console.log("[" + new Date().toISOString().substring(2, 19).replace("T", " ").replace(/[Z\-]/g, "") + "] " + msg);
};
