{pkgs}: {
  deps = [
    pkgs.run
    pkgs.boot
    pkgs.unzip
    pkgs.postgresql
    pkgs.jq
  ];
}
