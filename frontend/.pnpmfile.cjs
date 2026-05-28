function readPackage(pkg) {
  if (pkg.dependencies && pkg.dependencies.handlebars) {
    pkg.dependencies.handlebars = "^4.7.9";
  }
  if (pkg.dependencies && pkg.dependencies.vite) {
    pkg.dependencies.vite = "^8.0.14";
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
