import Joi from 'joi';

const ArgValueSchema = Joi.alternatives().try(
  Joi.string(),
  Joi.array().items(Joi.string()),
  Joi.number(),
  Joi.boolean()
);

const CommandTypeSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  action: Joi.function().required(),
  args: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        default: ArgValueSchema.optional(),
      })
    )
    .optional(),
  options: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        default: ArgValueSchema.optional(),
        parse: Joi.function().optional(),
      })
    )
    .optional(),
}).unknown(false);

const PluginTypeSchema = Joi.function();

const ConfigTypeSchema = Joi.object({
  root: Joi.string().optional(),
  reactNativeVersion: Joi.string().optional(),
  reactNativePath: Joi.string().optional(),
  plugins: Joi.array().items(PluginTypeSchema).optional(),
  platforms: Joi.object().pattern(Joi.string(), PluginTypeSchema).optional(),
  commands: Joi.array().items(CommandTypeSchema).optional(),
  remoteCacheProvider: Joi.string().valid('github-actions').optional(),
}).unknown(false);

export { ConfigTypeSchema };
