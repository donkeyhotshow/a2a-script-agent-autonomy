{
  "step": "edit_code",
  "message": "Adding logging middleware.",
  "execute": {
    "write-file": {
      "path": "src/middleware/logger.js",
      "content": "module.exports = (req, res, next) => { console.log(req.method, req.path); next(); };"
    }
  },
  "completed": false
}
