// TODO: <DISABLED_MODE> - need uncomment for Mode activation in WEBUI

// import { modes } from '@/stores/alice';
// import { type CapabilitySubProps } from '../types';
//
// {capability.type === Capability.Mode && (
//   <>
//     <div>
//       <label className="aliceDeviceSkills-gridLabel" htmlFor={modeTypeId}>{t('alice.labels.mode-type')}</label>
//       <Dropdown
//         id={modeTypeId}
//         value={capability.parameters?.instance}
//         options={modes.map((mode) => ({ label: mode, value: mode }))}
//         onChange={({ value: instance }: Option<string>) => {
//           const val = capabilities.map((item, i) => i === key
//             ? { ...item, parameters: { ...item.parameters, instance } }
//             : item);
//           onCapabilityChange(val);
//         }}
//       />
//     </div>
//     <div>
//       <label className="aliceDeviceSkills-gridLabel" htmlFor={modeId}>{t('alice.labels.mode')}</label>
//       <Input
//         id={modeId}
//         value={capability.parameters?.modes}
//         isFullWidth
//         onChange={(modes: string) => {
//           const val = capabilities.map((item, i) => i === key
//             ? { ...item, parameters: { ...item.parameters, modes } }
//             : item);
//           onCapabilityChange(val);
//         }}
//       />
//     </div>
//   </>
// )}

export {};
