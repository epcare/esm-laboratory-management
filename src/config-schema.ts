import { Type, validator } from "@openmrs/esm-framework";

export const configSchema = {
  laboratoryQueueConcept: {
    _type: Type.String,
    _default: "1836ac8a-a855-4c7e-b2ba-a290233c67b7",
    _description: "Concept uuid for the laboratory queue.",
    _globalProperty: "labmanagement.queueConcept",
  },
  laboratoryLocationTag: {
    _type: Type.String,
    _default: "Laboratory",
    _description: "Location tag for laboratory locations.",
    _globalProperty: "labmanagement.locationTag",
  },
  laboratorySpecimenTypeConcept: {
    _type: Type.ConceptUuid,
    _default: "162476AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    _description: "Concept UUID for laboratory specimen types",
    _globalProperty: "labmanagement.specimenTypeConcept",
  },
  laboratoryEncounterTypeUuid: {
    _type: Type.String,
    _default: "214e27a1-606a-4b1e-a96e-d736c87069d5",
    _description: "Concept uuid for the laboratory tool encounter type.",
    _globalProperty: "labmanagement.encounterTypeUuid",
  },
  artCardEncounterTypeUuid: {
    _type: Type.String,
    _default: "8d5b2be0-c2cc-11de-8d13-0010c6dffd0f",
    _description: "Concept uuid for the laboratory tool encounter type.",
    _globalProperty: "labmanagement.artCardEncounterTypeUuid",
  },
  laboratoryOrderTypeUuid: {
    _type: Type.String,
    _default: "52a447d3-a64a-11e3-9aeb-50e549534c5e",
    _description: "Uuid for orderType",
    _globalProperty: "labmanagement.orderTypeUuid",
  },
  laboratoryReferalDestinationUuid: {
    _type: Type.String,
    _default: "b1f8b6c8-c255-4518-89f5-4236ab76025b",
    _description: "Concept uuid for laboratory referals destinations",
    _globalProperty: "labmanagement.referalDestinationUuid",
  },

  enableSendingLabTestsByEmail: {
    _type: Type.Boolean,
    _default: false,
    _description: "This enables sending results to patient via email",
    _globalProperty: "labmanagement.enableSendingLabTestsByEmail",
  },
  enableSpecimenIdAutoGeneration: {
    _type: Type.Boolean,
    _default: true,
    _description: "Configuration to require auto specimen id generation.",
    _globalProperty: "labmanagement.enableSpecimenIdAutoGeneration",
  },
  laboratoryTestGroupConcept: {
    _type: Type.String,
    _default: "162384AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", //TODO: Get right concept
    _description: "Concept uuid for grouping tests.",
    _globalProperty: "labmanagement.testGroupConcept",
  },
  laboratoryOtherReferenceLabConcept: {
    _type: Type.String,
    _default: "3476fd97-71da-4e9c-bf57-2b6318dc0c9f",
    _description: "Concept uuid for grouping tests.",
    _globalProperty: "labmanagement.otherReferenceLabConcept",
  },
  laboratoryBarcodeIdGenIdentifierSource: {
    _type: Type.String,

    _default: "66bfa314-4881-11ef-9d0e-00155d78897e",
    _description: "Identifier source uuid passed when generating numbers",
    _globalProperty: "labmanagement.barcodeIdGenIdentifierSource",
  },
  laboratoryBarcodePrintUri: {
    _type: Type.String,

    _default: "metsbcp://print/bc128/%BARCODE%|||%TYPE%|||%NAME%",
    _description:
      "URI for triggering printing a barcode. Use %BARCODE% placeholder.",
    _globalProperty: "labmanagement.barcodePrintUri",
  },
  laboratoryBarcodeGenerateAndPrint: {
    _type: Type.Boolean,
    _default: true,
    _description: "After generation of barcode, print it.",
    _globalProperty: "labmanagement.barcodeGenerateAndPrint",
  },
  laboratoryBarcodeAlgorithm: {
    _type: Type.String,
    _default: "date_number_48bit",
    _description: "Barcode generation algorithm",
    _globalProperty: "labmanagement.barcodeAlgorithm",
    _validators: [
      validator(
        (n) =>
          [
            "number_plain",
            "year2_week2_day1_number",
            "date_number_48bit",
            "ugemr",
          ].some(n),
        "Value has to be one of:- number_plain, year2_week2_day1_number, date_number_48bit, ugemr"
      ),
    ],
  },
  laboratoryContainerTypeConcept: {
    _type: Type.ConceptUuid,
    _default: "bce2b1af-98b1-48a2-98a2-3e4ffb3c79c2",
    _description: "Concept UUID for laboratory container types",
    _globalProperty: "labmanagement.containerTypeConcept",
  },
  laboratoryVolumeMeasurementTypeConcept: {
    _type: Type.ConceptUuid,
    _default: "162402AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    _description: "Concept UUID for laboratory volume measurement types",
    _globalProperty: "labmanagement.volumeMeasurementTypeConcept",
  },
  laboratoryLocationTagUuid: {
    _type: Type.String,
    _description: "Laboratory location tag",
    _default: "1e6acc3e-696d-47de-8f74-63ed7bbe6e81",
    _globalProperty: "labmanagement.locationTagUuid",
  },
  laboratoryMainLocationTag: {
    _type: Type.String,
    _default: "Main Laboratory",
    _description: "Location tag for main laboratory location.",
    _globalProperty: "labmanagement.mainLaboratoryTag",
  },
  laboratoryHealthCenterName: {
    _type: Type.String,
    _default: "",
    _description: "Health center name that appears on prints.",
    _globalProperty: "labmanagement.healthCenterName",
  },
  laboratoryPrintLogoUri: {
    _type: Type.String,
    _default: "",
    _description: "Logo URI for laboratory print.",
    _globalProperty: "labmanagement.printLogoUri",
  },
  laboratoryPrintLogoText: {
    _type: Type.String,
    _default: "",
    _description: "Text that appears below logo.",
    _globalProperty: "labmanagement.printLogoText",
  }, //
  laboratoryCloseAfterPrint: {
    _type: Type.Boolean,
    _default: "true",
    _description: "Close print window after print.",
    _globalProperty: "labmanagement.closeAfterPrint",
  },
  laboratoryRequireSingleTestTypeForResultsImport: {
    _type: Type.Boolean,
    _default: "true",
    _description: "Worksheet must have single test type to import results.",
    _globalProperty: "labmanagement.requireSingleTestTypeForResultsImport",
  },
  laboratoryReferralViewImplementation: {
    _type: Type.String,
    _default: "simple",
    _description:
      "Determines which referral view implementation to use in the laboratory module. 'simple' uses the UgandaEMR-style sync with better tracking of synced tests. 'advanced' uses the original esm-laboratory-management implementation.",
    _globalProperty: "labmanagement.referralViewImplementation",
  },
};

export type Config = {
  laboratoryQueueConcept: string;
  laboratoryLocationTag: string;
  laboratoryLocationTagUuid: string;
  laboratorySpecimenTypeConcept: string;
  laboratoryEncounterTypeUuid: string;
  laboratoryTestGroupConcept: string;
  laboratoryOtherReferenceLabConcept: string;
  laboratoryReferalDestinationUuid: string;
  enableSpecimenIdAutoGeneration: boolean;
  laboratoryBarcodeAlgorithm: string;
  laboratoryBarcodePrintUri: string;
  laboratoryBarcodeGenerateAndPrint: boolean;
  laboratoryBarcodeIdGenIdentifierSource: string;
  laboratoryContainerTypeConcept: string;
  laboratoryVolumeMeasurementTypeConcept: string;
  laboratoryMainLocationTag: string;
  laboratoryHealthCenterName: string;
  laboratoryPrintLogoUri: string;
  laboratoryPrintLogoText: string;
  laboratoryCloseAfterPrint: boolean;
  enableSendingLabTestsByEmail: boolean;
  laboratoryRequireSingleTestTypeForResultsImport: boolean;
  laboratoryReferralViewImplementation: string;
};
