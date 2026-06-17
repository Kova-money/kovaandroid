const { toPermissionValidator } = require('@zerodev/permissions');
const { toCallPolicy } = require('@zerodev/permissions/policies');
const { toECDSASigner } = require('@zerodev/permissions/signers');
console.log("Imports successful", !!toPermissionValidator, !!toCallPolicy, !!toECDSASigner);
