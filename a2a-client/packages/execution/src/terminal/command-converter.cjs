// Minimal command-converter implementation expected by `terminal-handler.cjs`.
// If the richer emulation logic isn't present, we default to "no emulated commands".

class CommandConverter {
  static isEmulatedCommand(_command) {
    return false;
  }

  static listEmulatedCommands() {
    return [];
  }
}

const commandConverter = {
  convertToMCPTool(_command) {
    return null;
  },
};

module.exports = { CommandConverter, commandConverter };

