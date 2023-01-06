<template>
	<div>
    <checkbox
      v-if=" field.type == 'boolean'  "
      @change="change"
      v-model="field.value"
    />
    <input
      :type="field.type"
      v-if="field.type == 'text' || field.type == 'number'|| field.type == 'password'"
      :placeholder="field.label"
      v-model="field.value"
      @change="change"
    />
    <select
      class="form-width"
      @change="toggleSelect(field)"
      v-model="field.value"
      :placeholder="field.label"
      v-if=" field.type == 'select'"
    >
      <option
        :key="index3"
        v-for="(option, index3) in field.values ||
          field.options "
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <textarea
      v-model="field.value"
      @change="change"
      v-if="field.type == 'textarea'"
      :placeholder="field.label"
      class="form-width"
      :autosize="{ minRows: 4, maxRows: 6 }"
    />
  </div>
</template>

<script>
export default {
  name: "AutoForm",
  props: ["field"],
  data() {
    return {
      valueset: {
        "HTTP Header": [{ label: "HTTP Header", value: "" }],
      },
    };
  },

  methods: {
    change(e) {
      this.$emit("change", e);
    },
		
    toggleSelect(field) {
      if (
        this.valueset[field.value] &&
        this.valueset[field.value].length > 0
      ) {
        field.subfields = this.valueset[field.value];
      } else {
        delete field.subfields;
      }
    },
  },
};
</script>

<style lang="less" scoped>
  .form-tips {
    color: #aaa;
    font-size: 8pt;
  }
</style>
