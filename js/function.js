function confirmHardShutdown() {
    if (confirm("确定要硬关机吗？此操作可能会导致设备故障！")) {
        controlDevice('compulsion');
    }
}