<script lang="ts" setup></script>

<template>
	<div class="field-row grid items-start gap-3 sm:flex sm:flex-row"><slot /></div>
</template>

<style>
.field-row > * {
	flex: 1;
}
</style>
